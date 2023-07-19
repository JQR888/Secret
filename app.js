//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const port = process.env.PORT || 3000; // Use the port provided by Heroku or default to 3000
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption")
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
//const { Strategy } = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const secret = process.env.SECRET


app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false

}));


app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://eecvlg:test123@cluster0.hxia1sj.mongodb.net/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});



//userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null, user.id);

});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);


app.get("/", function(req,res){
    res.render("home")

})

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));


app.get("/login", function(req,res){
    res.render("login");
});

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets page
    res.redirect("/secrets");
  }
);





app.get("/register", function(req,res){
    res.render("register")

})

app.get("/secrets", function(req, res) {
  User.find({ "secret": { $ne: null } })
    .then(function(foundUsers) {
      if (foundUsers) {
        res.render("secrets", { userWithSecrets: foundUsers });
      }
    })
    .catch(function(err) {
      console.log(err);
    });
});



app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
   res.render("submit");

  } else {
   res.redirect("/login")};
   
});


app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id)
    .then(function(foundUser) {
      foundUser.secret = submittedSecret;
      return foundUser.save();
    })
    .then(function() {
      res.redirect("/secrets");
    })
    .catch(function(err) {
      console.log(err);
    });
});

app.post("/register", function(req, res) {
    User.register(new User({ username: req.body.username }), req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    });
  });
  



app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password

    });

    req.login(user, function(err){
        if (err){
            console.log(err)
        } else {
        
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");

            });
        }
    }) 
  });
  
  
  app.get("/logout", function(req, res) {
    req.logout(function(err) {
      if (err) {
        // Handle error
        console.error(err);
      }
      // Additional logic or redirection after logout
      res.redirect("/");
    });
  });
  




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  
  