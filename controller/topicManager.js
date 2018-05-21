const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const dataFolder = './data/';

var db = new sqlite3.Database('./topicExplorer.sqlite', function(err){
    if(err){
        return console.log(err.message);
    }

    console.log("Connected to sqlite file locally.")

    var createStmt = "Create table if not exists topics (id INTEGER PRIMARY KEY AUTOINCREMENT, topicName varchar UNIQUE, topicData text, topic text)";

    db.run(createStmt);
});

function list(req, res) {
    var query = "SELECT id, topicName FROM topics";
    db.all(query, {}, function(err, rows) {
        if(err) {
            return res.status(500).json({error:err.message});
        }
        return res.json(rows);
    });
}

function get(req, res) {
    var query = "SELECT id, topicName FROM topics WHERE topicName like '" + req.query.topicName+"'";
    db.all(query, {}, function(err, rows) {
        if(err) {
            return res.status(500).json({error:err.message});
        }
        return res.json(rows);
    });
}

function save(req, res) {

    var query = "UPDATE topics "+
            "SET topicData = '"+ req.body.topicData +"'," +
            "topic  = '"+ req.body.topic +"' " +
            "WHERE topicName like '" + req.body.topicName + "'"

    db.run(query, {}, function(err) {
        if(err) {
            return res.status(500).json({error:err.message});
        }
        return res.json({"status": "Saved successfully."});
    });

}

function destroy(req, res) {
    var query = "DELETE FROM topics WHERE topicName like '" + req.body.topicName + "'"

    db.run(query, {}, function(err) {
        if(err) {
            return res.status(500).json({error:err.message});
        }
        return res.json({"status": "Saved successfully."});
    });
}

function listTopicFileNames(req, res) {
    fs.readdir(dataFolder, function (err, files) {
        if(err) {
            return res.json([]);
        }
        var topicNames = [];
        files.forEach(function(file) {
            topicNames.push(file.replace(".json",""));
        });
        res.json(topicNames);
    });
}

function getPersistedTopic(req, res) {
    if(req.query.topicName) {
        var topicFilePath = "../data/" +req.query.topicName.trim() +".json";
        var topicContent = require(topicFilePath);
        res.json(topicContent);
    } else {
        return res.json({});
    }

}

function persistTopicAsFile(req, res) {
    try {
        var bodyData = req.body;
        if (bodyData.modelName && bodyData.model) {

            fs.writeFile("./data/"+bodyData.modelName + ".json", JSON.stringify(bodyData.model), 'utf8', function (err) {
                if (err) {
                    res.status(500).json({error: err.message});
                }
                res.json({msg: "Saved Successfully"});
            });
        } else {
            res.status(500).json({error: "Invalid body parameters"});
        }
    } catch(e){
        res.status(500).json({error: "Invalid body parameters"});
    }
}

function deleteTopicFile(req, res) {
    fs.unlink("./data/"+req.query.modelName + ".json", function(err){
        if (err) {
            res.status(500).json({error: err.message});
        }
        res.json({msg: "Deleted Successfully"});
    });
}

exports.list = list;
exports.listTopicFileNames = listTopicFileNames;
exports.getPersistedTopic = getPersistedTopic;
exports.persistTopicAsFile = persistTopicAsFile;
exports.get = get;
exports.save = save;
exports.destroy = destroy;
exports.deleteTopicFile = deleteTopicFile;
