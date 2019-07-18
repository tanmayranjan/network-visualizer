const express = require('express');
const router = express.Router();

const auth_middleware = require('./../middlewares/auth.middleware');
//setup the neo4J data driver
const neo4j = require('./../neo4jDriverUtility');

router.use(express.json());

router.get('/initialdata', (req, res) => {
    console.log('initial data');
    // get initial data from the data base
    neo4j.getData()
    .then(response => {
        res.send(response);
    })
    .catch(err => {
        console.log('err occured while sending back ', err);
        res.sendStatus(500);
    });
});

router.get('/graph/metadata', (req,res) => {
    console.log('get metadata');
    neo4j.getMetaData()
    .then(response => {
        res.send(response);
    })
    .catch(err => {
        console.log('err occured while sending back meta data', err);
        res.sendStatus(500);
    });
    // get the meta data for the selected graph
    // Meta data will give the following :
    // 1. Total Organisations and there names
    // 2. Total Relationships and there names
});

router.post('/graph/data', (req,res) => {
    console.log('get graph data');
    // get the body, else return the error that no body is provided
    if (!!Object.keys(req.body).length) {
        neo4j.getGraphData(req)
        .then( response => {
            res.send(response);
        })
        .catch( err => {
            console.log('err occured while sending back graph data', err);
            res.sendStatus(500);
        });
    } else {
        // empty object is not allowed
        console.log('empty body recieved in the req');
        res.status(400).send({'error': 'Request Body is required to access the API'});
    }
});

router.post('/search/neo4j',auth_middleware.searchAuth,(req,res)=> {
    console.log('search api hit');
    if (req.body.constructor === Object) {
        if (Object.keys(req.body).length > 0) {
            if (req.body.hasOwnProperty('query')) {
                if (req.body.query.length > 0) {
                    let rawQuery = !!req.body.raw ? true : false;
                    neo4j.searchQuery(req.body,rawQuery)
                    .then( response => {
                        console.log('sending back response');
                        res.send(response);
                    })
                    .catch( err => {
                        console.error('err occured while sending back the search query data ', err);
                        res.send(err);
                    });
                }
                else {
                    // empty query key is not entertained
                    console.error('Error : /search/neo4j | empty query key provided');
                    res.status(400).send({'error': 'Empty query key is not allowed'})
                }
            } else {
                // cannot query without a query key
                console.error('Error : /search/neo4j | no query key provided');
                res.status(400).send({'error': 'query key not provided'});
            }
        }
        else {
            // empty body is not entertained
            console.error('Error : /search/neo4j | empty body provided');
            res.status(400).send({'error': 'Empty body not allowed'});
        }
    }
    else {
        // type of body should be an object
        console.error('Error : /search/neo4j | req.body is not an object');
        res.status(400).send({'error': 'body should be an object with a key query'});
    }
});

router.get('/graph/labels', (req,res) => {
    neo4j.getGraphLabels()
    .then(result => {
        res.send(result);
    })
    .catch(err => {
        console.log('err occured while sending back labels data');
        res.status(500).send(err);
    })
})

module.exports = router;
