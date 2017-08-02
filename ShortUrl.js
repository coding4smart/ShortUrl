/*
 * URL Shortern Microservice,
 *
 * tangjicheng@gmail.com
 *
 * 1.accepts a request url and generate a shorter one to response,
 * get error if url is invalid http(s) url,
 * 2.redirect to the original url if request to access the shorter
 * url.
 *
 * returns {'original_url':url,'short_url':short_url}.
 *
 */
var fs = require("fs");
var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
var urlexp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

app.post("/new/*", function (request, response) {
  var url = request.url;
  url = url.replace('/new/','');

  //validate url
  if(!urlexp.test(url)) {
    var errjson = {'error':"This is not a valid http(s) url!"};
    response.send(JSON.stringify(errjson));
    return response.end();
  }
  //store to db
  var now = new Date();
  var dburl;
  fs.readFile( __dirname + "/" + ".env", 'utf8', function (err, data) {
       //console.log( data );
       if(err) return console.log("Error when reading dburl: "+err);
       dburl = data;
   });
  if(dburl) {
    mongo.connect(dburl, function(err,db) {
      if(err)
        return console.log("Error when connect mongodb :"+err);
      var nowtime = Math.round(now.getTime()/1000.0);
      var protocol = request.header('x-forwarded-proto');
      var short_url = protocol.split(',')[0]+"://"+request.header('host')+"/"+nowtime;
      var short_url_json = {'key':nowtime, 'original_url':url,'short_url':short_url};
      db.collection('short_urls').insert(short_url_json,function (error,data) {
        if(error)
          return console.log("Error when insert short url: "+error);
        var url_json = {'original_url':url,'short_url':short_url};
        response.send(JSON.stringify(url_json));
        response.end();
      });
      db.close();
    });
  }
});

app.get("/:id", function (request, response) {
  var url = request.url;
  var numDate = Math.round(parseInt(url.replace('/','')));
  
  if(numDate) {
    var dburl;
    fs.readFile( __dirname + "/" + ".env", 'utf8', function (err, data) {
       //console.log( data );
       if(err) return console.log("Error when reading dburl: "+err);
       dburl = data;
    });
    if(dburl) {
      mongo.connect(dburl, function(err,db) {
        if(err)
          return console.log("Error when connect mongodb :"+err);
        
        db.collection('short_urls').findOne({'key':numDate},function (error,doc) {
          if (error)
            return console.log("Error occurred when query from mongo :"+error);
          
          response.redirect(doc.original_url);
        });
        db.close();
      });
    }
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
