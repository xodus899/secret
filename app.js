//jshint esversion:6+
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const ejs = require('ejs');
const port = process.env.PORT;

const app = express();


app.use(session({
  secret: 'our secret',
  resave: false,
  saveUninitialized: false,
  // does not authenticate if not https, and will faill authentication and not login or redirect to /secrets
  // cookie: { secure: true }
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
};


//db
  const userSchema = new mongoose.Schema ({
    username:String,
    password:String,
    secret: Array
  });
  //hash-salt-save users
  userSchema.plugin(passportLocalMongoose);
  const User = mongoose.model('User', userSchema);
//end db

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.get('/', (request,response) => {
  if(request.user) {
    response.redirect('/secrets');
  } else {
    response.render('home')
  }
});

app.get('/login', (request,response) => {
  if(request.user) {
    response.redirect('/secrets');
  } else {
    response.render('login');
  }
});

app.post('/login',passport.authenticate('local', { failureRedirect: '/login' }), (request,response) => {
  const user = new User ({
    username: request.body.username,
    password: request.body.password
  });

  request.login(user, (err) => {
  if (err) {
     console.log(err)
     response.redirect("/login")
  }
    passport.authenticate('local')(request,response, () => {
    response.redirect('/secrets');
  });
});

});

app.get('/register', (request,response) => {
  response.render('register');
});

app.get('/secrets', (request,response) => {
  User.find({"secret":{$ne:null}}, (err,foundUsers) => {
    if(err) {
      response.write(err);
    } else {
      response.render('secrets', {usersWithSecrets: foundUsers});
    }
  })
});

app.post('/register', (request,response) => {
  User.register({username:request.body.username}, request.body.password , (err, newUser) => {
    if (err) {
      console.log(err)
      response.redirect('/register');
    } else {
      passport.authenticate('local')(request,response, () => {
        response.redirect('/secrets');
      });
    }
  });
});

app.get('/submit', (request,response) => {
  if(request.isAuthenticated()) {
    response.render('submit');
  } else {
    response.redirect("/login");
  }
});

app.post('/submit', (request,response) => {
  const submittedSecret = request.body.secret;
  User.findById(request.user.id, (err,foundUser) => {
    if(!err) {
      // foundUser.secret = submittedSecret;
      foundUser.secret.push(submittedSecret);
      foundUser.save(() => {
        response.redirect('/secrets')
      })
    } else {
      response.write(err);
    }
  })
});

app.get('/logout', (request,response) => {
  request.logout();
  response.redirect('/');
});

app.get('*', function(request, response){
  response.render('404');
});

app.listen(port || 3000, () => {
  console.log("Server up and running, better go catch it.");
})
