const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('8325f5b9c10d49b1860cd73ccd4e5f2e');
var pos = require('pos');
var tagger = new pos.Tagger();
var stringSimilarity = require('string-similarity');
const request = require("request");
var lda = require('lda');
var async = require('async');
var d3 = require("d3");
var nlp = require('compromise')

const ODP_ROOT_URL = "http://content.guardianapis.com/search";
const ODP_API_KEY = "1e0a8b20-027d-49ec-9647-d538a7105b12";

// var topicData = require("../data/Topic-1.json");
function extractTopicsFromODP(req, res) {
    var query = req.query.text;//"hurricane AND harvey";
    var start_date = req.query.start_date;//"2017-01-01";
    var end_date = req.query.end_date;//"2018-12-15";
    var page_size = 200;
    var url = constructURL(query, start_date, end_date, page_size, 1);
    console.log(url);
    request.get(url, function(error, response, body) {
        var json = JSON.parse(body);
        var firstText = "";
        var totalCount = json.response.total;
        var allDocuments = [];
        for(i=0;i<json.response.results.length;i++) {
            var article = json.response.results[i];
            if(article.pillarName === "News") {
                firstText = firstText + " " + article.webTitle + ".";
                allDocuments.push({date: article.webPublicationDate, title: article.webTitle, url: article.webUrl, type: article.type});
            }
        }
        // console.log(text);

        var pageSize = totalCount / page_size;
        console.log("Total Documents: " + totalCount);

        var tasks = [];
        for(pageIndex= 2; pageIndex < pageSize+1; pageIndex++){
            tasks.push(retrieveTextFromODP.bind(query, start_date, end_date, query, page_size, pageIndex, allDocuments));
        }

        async.parallel(tasks, function (err, results, docArray) {

            for(var resIdx =0;resIdx<results.length;resIdx++) {
                firstText = firstText + results[resIdx]+".";
                allDocuments.concat(docArray);
            }

            var aggByDate = aggregateByDate(allDocuments, query);

            var selectedDates = aggByDate.top;
            var documentGrp = [];
            for (var tp = 0; tp < selectedDates.length; tp++) {
                var docs = [];
                for (var tpd = 0; tpd < selectedDates[tp].values.length; tpd++) {
                    docs.push({date: selectedDates[tp].key, text: selectedDates[tp].values[tpd].title});
                }
                documentGrp.push(docs.splice(0,200));
            }

            var ldaTopics = runLDA(documentGrp, 5, 5, query);


            res.json({documents: allDocuments, topics:ldaTopics, agg: aggByDate});

        });

    });

}

function sortByDateAscending(a, b) {
    return a.key - b.key;
}

function sortByValueCount(a, b) {
    return b.values.length - a.values.length;
}

function extractTopicsFromNewsAPI(req, res) {
    return res.send(topicData);
    var query = req.query.text;//"hurricane AND harvey";
    var start_date = req.query.start_date;//"2017-01-01";
    var end_date = req.query.end_date;//"2018-12-15";
    var page_size = 100;

    newsapi.v2.everything({
        q: query,
        pageSize: page_size,
        language: 'en',
        from: start_date,
        to: end_date
    }).then(function (response) {

        var firstText = "";
        var totalCount = response.totalResults;
        var allDocuments = [];
        for(i=0;i<response.articles.length;i++) {
            var article = response.articles[i];
            firstText = firstText + " " + article.title + ".";
            allDocuments.push({date: article.publishedAt, title: article.title, url: article.url});
        }

        var pageSize = totalCount / page_size;
        console.log("Total Documents: " + totalCount);

        var tasks = [];
        for(pageIndex= 2; pageIndex < pageSize+1; pageIndex++){
            tasks.push(retrieveTextFromNewsAPI.bind(query, start_date, end_date, query, page_size, pageIndex, allDocuments));
        }

        async.parallel(tasks, function (err, results, docArray) {

            for(var resIdx =0;resIdx<results.length;resIdx++) {
                firstText = firstText + results[resIdx]+".";
                allDocuments.concat(docArray);
            }

            var aggByDate = aggregateByDate(allDocuments, query);

            var selectedDates = aggByDate.top;
            var documentGrp = [];
            for (var tp = 0; tp < selectedDates.length; tp++) {
                var docs = [];
                for (var tpd = 0; tpd < selectedDates[tp].values.length; tpd++) {
                    docs.push({date: selectedDates[tp].key, text: selectedDates[tp].values[tpd].title});
                }
                documentGrp.push(docs.splice(0,200));
            }

            var ldaTopics = runLDA(documentGrp, 5, 5, query);


            res.json({documents: allDocuments, topics:ldaTopics, agg: aggByDate});

        });

    });

}

function reduceSentence(text) {
    var words = new pos.Lexer().lex(text);
    var tagger = new pos.Tagger();
    var taggedWords = tagger.tag(words);
    var result = "";
    for (i=0;i<taggedWords.length;i++) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];
        // console.log( word + " /" + tag);
        if (tag === "NN" || tag === "NNP" || tag === "NNS") {
            if (i + 1 < taggedWords.length) {
                var taggedWordNext = taggedWords[i + 1];
                if (taggedWordNext[1] === "NN" || taggedWordNext[1] === "NNP" || taggedWordNext[1] === "NNS") {
                    word = word + "001" + taggedWordNext[0];
                    i = i+1;
                }
            }
        }
        if(tag === "NNP" || tag === "NN" || tag === "NNS" || tag === "VBD" || tag === "VBN") {
            //console.log(word);
            result = result + " " + word;//

        }
        if(word === ".") {
            result = result + ".";
        }
    }
    return result;
}

function aggregateByDate(data, keywords) {
    var parseTime = d3.timeParse("%Y-%m-%d");

    for (var i = 0; i < data.length; i++) {
        data[i].date = parseTime(data[i].date.substring(0, data[i].date.indexOf('T')));
    }

    var nested = d3.nest()
        .key(function (d) {
            return d.date
        })
        .entries(data);

    var count = 0;
    var dayCount = [];
    var dayIndex = [];
    var dayPeaks = [];
    for (var i = 0; i < nested.length; i++) {
        nested[i].key = new Date(nested[i].key);
        count = count + nested[i].values.length;
        dayCount[i] = nested[i].values.length;
    }
    var avgDocCount = count / nested.length;
    console.log("Average documents per day: " + (avgDocCount));
    [dayPeaks, dayIndex] = findPeaks(dayCount);
    console.log("Peaks days: " + (dayIndex));

    var valueNested = JSON.parse(JSON.stringify(nested));

    var selectedDates = [];
    for (var pInd = 0; pInd < dayIndex.length; pInd++) {
        selectedDates[pInd] = valueNested[dayIndex[pInd]];
    }
    // console.log(selectedDates);

    nested = nested.sort(sortByDateAscending);

    var tempSelDates = JSON.parse(JSON.stringify(selectedDates));
    tempSelDates = tempSelDates.sort(sortByValueCount);

    selectedDates = tempSelDates.slice(0,5);
    // console.log(selectedDates);

    //start
    // var count = 0;
    // for (var i = 0; i < nested.length; i++) {
    //     nested[i].key = new Date(nested[i].key);
    //     count = count + nested[i].values.length;
    // }
    // var avgDocCount = count / nested.length;
    // console.log("Average documents per day: " + (avgDocCount));
    //
    // var valueNested = JSON.parse(JSON.stringify(nested));
    // valueNested = valueNested.sort(sortByValueCount);
    //
    // var selectedDates = valueNested.slice(0,5);
    // console.log(selectedDates);
    //
    // var documentGrp = [];
    // for (var tp = 0; tp < selectedDates.length; tp++) {
    //     var docs = [];
    //     for (var tpd = 0; tpd < selectedDates[tp].values.length; tpd++) {
    //         docs.push({date: selectedDates[tp].key, text: selectedDates[tp].values[tpd].title});
    //     }
    //     documentGrp.push(docs.splice(0,200));
    // }

    // end
    nested = nested.sort(sortByDateAscending);

    var selectDtKeys = {};
    for (var n = 0; n < selectedDates.length; n++) {
        var dt = selectedDates[n];
        var dt1 = new Date(dt.key);
        selectDtKeys[dt1.toDateString()] = "";
    }

    for (var n = 0; n < nested.length; n++) {
        var dt = nested[n];
        var dt1 = new Date(dt.key);
        if(dt1.toDateString() in selectDtKeys) {
            dt.keyTopic = true;
        } else {
            dt.keyTopic = false;
        }
        var prevScore = 0;
        var title = "";
        var text = "";
        for (var y = 0; y < dt.values.length; y++) {
            var doc = dt.values[y];
            // console.log(JSON.stringify(doc));
            var measure = stringSimilarity.compareTwoStrings(keywords, doc.title);
            if (measure > prevScore) {
                title = doc.title;
            }

            text += doc.title;
        }

        var doc = nlp(text);
        var topConcepts = doc.topics().data();

        dt.ner = topConcepts;
        dt.title = title;

    }



    return {grouped: nested, top: selectedDates};
}

function extractLDATopic(req, res) {
    var documentGroup = req.body.documents;
    var topicCount = 5;
    var wordsPerTopic = 5;
    if(req.body.topicCount){
        topicCount = req.body.topicCount;
    }

    if(req.body.wordsPerTopic){
        wordsPerTopic = req.body.wordsPerTopic;
    }

    var topics = lda(documentGroup, topicCount, wordsPerTopic);
    res.json({topics:topics});
}

function runLDA(documentGroup, topicCount, wordsPerTopic, keywords){
    var topics = [];
    for(var t=0;t<documentGroup.length;t++) {
        var docs = documentGroup[t];
        var text = "";
        var text2 = "";
        // var keywords = req.body.keywords;
        var prevScore = 0;
        // var title = "";

        var doc2LDA = [];
        for (var y = 0; y < docs.length; y++) {
            var measure = stringSimilarity.compareTwoStrings(keywords, docs[y].text);
            if(measure > prevScore) {
                title = docs[y].text;
            }
            prevScore = measure;
            text += docs[y].text;
            // text2 += docs[y].text+".\n";
            doc2LDA.push(reduceSentence(docs[y].text));
        }

        console.log(title);

        // var doc = nlp(text);
        // var topConcepts = doc.topics().data();
        console.log(docs[0]);
        var result = lda(doc2LDA, topicCount, wordsPerTopic);
        topics.push({date: documentGroup[t][0].date, topics:result});
    }
    return topics;
}

function findPeaks(arr) {
    var peak;
    var peaksInd = [];
    return arr.reduce(function(peaks, val, i) {
        if (arr[i+1] > arr[i]) {
            peak = arr[i+1];
        } else if ((arr[i+1] < arr[i]) && (typeof peak === 'number')) {
            peaks.push(peak);
            peaksInd.push(i);
            peak = undefined;
        }
        return [peaks, peaksInd];
    }, []);
}

function retrieveTextFromNewsAPI(start_date,end_date, query, page_size, pageIndex, allDocuments,callback) {
    newsapi.v2.everything({
        q: query,
        page: pageIndex,
        pageSize: page_size,
        language: 'en',
        from: start_date,
        to: end_date
    }).then(function (response) {
        console.log("result received for " + pageIndex);
        var text = "";
        for(i=0;i<response.articles.length;i++) {
            var article = response.articles[i];
            text = text + " " + response.articles[i].title + ".";
            allDocuments.push({date: article.publishedAt, title: article.title, url: article.url});
        }

        callback(null, text, allDocuments);
    });
}

function retrieveTextFromODP(start_date,end_date, query, page_size, pageIndex, allDocuments,callback) {
    var url = constructURL(query, start_date,end_date, page_size, pageIndex);
    console.log(url);
    request.get(url, function(error, response, body) {
        console.log("result received for " + pageIndex);
        var json = JSON.parse(body);
        var text = "";
        for(i=0;i<json.response.results.length;i++) {
            var article = json.response.results[i];
            if(article.pillarName === "News") {
                text = text + " " + json.response.results[i].webTitle + ".";
                allDocuments.push({date: article.webPublicationDate, title: article.webTitle, url: article.webUrl, type: article.type});
            }
        }

        callback(null, text, allDocuments);
    });
}

function constructURL(query, start_date, end_date, page_size, page) {
    var url = ODP_ROOT_URL +
        "?page-size=" + page_size +
        "&page=" + page +
        "&from-date=" + start_date +
        "&to-date=" + end_date +
        "&q=" + query +
        "&order-by=oldest" +
        "&api-key=" + ODP_API_KEY;
    return encodeURI(url);
}

function clusterDocuments (req, res) {
    var carrot2 = require('carrot2');
    var dcs = new carrot2.DocumentClusteringServer({host: "localhost", port: 8080});

    var documentGroup = JSON.parse(req.body.documentGroup);
    var topicCount = 5;
    var wordsPerTopic = 5;
    if(req.body.topicCount){
        topicCount = req.body.topicCount;
    }

    if(req.body.wordsPerTopic){
        wordsPerTopic = req.body.wordsPerTopic;
    }

    var topics = [];
    var sr = new carrot2.SearchResult();

    var count = 1;
    for(var t=0;t<documentGroup.length;t++) {
        var docs = documentGroup[t];
        for (var y = 0; y < docs.length; y++) {
            // docs[y] = reduceSentence(docs[y]);
            sr.addDocument(count, docs[y].text, "http://www.site.com/", docs[y], {"date": docs[y].date});
            count++;
        }
    }

    dcs.cluster(sr, {algorithm:'lingo', max:200}, [
        {key:"LingoClusteringAlgorithm.desiredClusterCountBase", value:10},
        {key:"LingoClusteringAlgorithm.phraseLabelBoost", value:2.0}
    ], function(err, sr) {
        if (err) console.log(err);
        var cluster = sr.clusters;
        res.json(cluster);
    });
    //res.json({topics:topics});

}

exports.extractTopicsFromODP = extractTopicsFromODP;
exports.extractTopicsFromNewsAPI = extractTopicsFromNewsAPI;
exports.extractLDATopic = extractLDATopic;
exports.clusterDocuments = clusterDocuments;