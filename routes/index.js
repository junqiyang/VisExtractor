var express = require('express');
var router = express.Router();
var openDataPlatform = require('../controller/openDataPlatform');
var topicManager = require('../controller/topicManager');

router.get('/', function(req, res, next) {
  res.render('index', { title: 'News Topic Explorer' });
});

router.get('/topicModeler', function(req, res, next) {
    res.render('topicModeler', { title: 'News Topic Explorer' });
});

router.get('/api/extractTopicsFromODP', openDataPlatform.extractTopicsFromODP);
router.get('/api/extractTopicsFromNewsAPI', openDataPlatform.extractTopicsFromNewsAPI);
router.post('/api/extractLDATopic', openDataPlatform.extractLDATopic);

router.get('/api/topic/listTopicFileNames', topicManager.listTopicFileNames);
router.get('/api/topic/getPersistedTopic', topicManager.getPersistedTopic);
router.get('/api/topic/deleteTopicFile', topicManager.deleteTopicFile);
router.post('/api/topic/persistTopicAsFile', topicManager.persistTopicAsFile);

router.get('/api/topic/get', topicManager.get);
router.get('/api/topic/list', topicManager.list);
router.post('/api/topic/save', topicManager.save);
router.delete('/api/topic/destroy', topicManager.destroy);

module.exports = router;
