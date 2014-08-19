var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');




var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({secret:'toysrus'}));
app.use(cookieParser('toysrus'));



function checkUser(req, res, next){
  if(req.session.user){
    next();
  } else {
    req.session.error = 'Access denied.';
    res.redirect('/login');
  }
}

app.get('/',
function(req, res) {
  res.redirect('/index');

});

app.get('/create', checkUser,
function(req, res) {
  res.redirect('index');
});

app.get('/links', checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/index', checkUser,
  function(req, res){
    res.render('index');
});
app.get('/signup',
  function(req, res){
    res.render('signup');
  });

app.get('/login',
  function(req, res){
    res.render('login');
  });

app.get('/logout',
  function(req, res){
    req.session.destroy(function(){
      res.redirect('/');
    });
  });

app.post('/login',
  function(req, res){
    console.log("REQ.BODY: " + JSON.stringify(req.body));

    new User({'username' : req.body.username}).fetch()
    .then(function(userRow){
      console.log("USER WAS FETCHED - ", userRow);
      if(!userRow){
        console.log("user doesn't exist")
        res.redirect('/login');
        return;
      } else if(userRow.attributes.password === req.body.password) {
        console.log('Password verified.')
        req.session.regenerate(function(){
          req.session.user = req.body.username;
          res.redirect('/index');
        });
      }

    });
  });

app.post('/signup',
  function(req, res){
    new User({'username': req.body.username}).fetch()
    .then(function(userRow){
      if(userRow){
        res.redirect('/signup');

      }else {
        var user = new User({
          username: req.body.username,
          password: req.body.password
        });
        user.save()
        .then(function(newUser){
          Users.add(newUser);
          res.redirect('/login');
        });
      }
    });
  });

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  console.log("In link path: The URL is definitely valid.");
  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      console.log("In link path: The link has been found. found.attributes: " + found.attributes);
      res.send(200, found.attributes);
    } else {
       console.log("In link path: The link was not found.");
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        console.log("SINCE LINK WAS NOT FOUND, CREATING A NEW LINK NOW.... " );
        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });
         console.log("SAVING NEW LINK NOW" );
        link.save().then(function(newLink) {
          Links.add(newLink);
          console.log("LINK WAS SAVED SUCCESSFULLY: ",newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
