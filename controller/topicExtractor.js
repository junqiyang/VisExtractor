const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('8325f5b9c10d49b1860cd73ccd4e5f2e');
var lda = require('lda');
// var vfile = require('to-vfile');
var retext = require('retext');
var keywords = require('retext-keywords');
var nlcstToString = require('nlcst-to-string');
var pos = require('pos');
var tagger = new pos.Tagger();
// To query /v2/top-headlines
// All options passed to topHeadlines are optional, but you need to include at least one of them

newsapi.v2.everything({
    q: "cambridge analytica",
    pageSize: 100,
    language: 'en',
    from: '2017-04-16',
    to: '2018-04-16'
}).then(function (response) {
    var articles = response.articles;
    var text = "";



    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        text += article.description + ".";
    }

    text = reduceSentence(text);

    var documents = text.match(/[^\.!\?]+[\.!\?]+/g);
    var result = lda(documents, 10, 5);
    console.log(result);


    retext()
        .use(keywords)
        .process(text, function (err, file) {
                if (err) throw err;

                console.log('Keywords:');
                file.data.keywords.forEach(function (keyword) {
                    console.log(nlcstToString(keyword.matches[0].node));
                });

                console.log();
                console.log('Key-phrases:');
                file.data.keyphrases.forEach(function (phrase) {
                    console.log(phrase.matches[0].nodes.map(nlcstToString).join(''));
                });
            }
        );

});

function reduceSentence(text) {
    var words = new pos.Lexer().lex(text);
    var tagger = new pos.Tagger();
    var taggedWords = tagger.tag(words);
    var result = "";
    for (i=0;i<taggedWords.length;i++) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];
        console.log( word + " /" + tag);
        if (tag === "NN" || tag === "NNP" || tag === "NNS") {
            if (i + 1 < taggedWords.length) {
                var taggedWordNext = taggedWords[i + 1];
                if (taggedWordNext[1] === "NN" || taggedWordNext[1] === "NNP" || taggedWordNext[1] === "NNS") {
                    word = word + "-" + taggedWordNext[0];
                    i = i+1;
                }
            }
        }
        if(tag === "NNP" || tag === "NN" || tag === "NNS" || tag === "VBD" || tag === "VBN") {
            result = result + " " + word;//

        }
        if(word === ".") {
            result = result + ".";
        }
    }
    return result;
}

// // To query /v2/everything
// // You must include at least one q, source, or domain
// newsapi.v2.everything({
//     q: 'bitcoin',
//     sources: 'bbc-news,the-verge',
//     domains: 'bbc.co.uk, techcrunch.com',
//     from: '2017-12-01',
//     to: '2017-12-12',
//     language: 'en',
//     sortBy: 'relevancy',
//     page: 2
// }).then(function(response)  {
//     console.log(response);
// });
//
// // To query sources
// // All options are optional
// newsapi.v2.sources({
//     category: 'technology',
//     language: 'en',
//     country: 'us'
// }).then(function(response)  {
//     console.log(response);
// });
