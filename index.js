const express = require('express');
var bodyParser = require('body-parser');

const app = express();
const port = 3001;
app.use(bodyParser.urlencoded({ extended: false }));

    app.get('/', function(req, res){
            res.sendFile(__dirname + '/index.html');       
    });

    app.listen(port, () => console.log(`api app listening on port ${port}!`));
