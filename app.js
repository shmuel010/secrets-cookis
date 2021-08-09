//jshint esversion:6
require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(require('serve-static')(__dirname + '/../../public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://admin-shmuel:a02580258A@cluster0.00zcw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority\n", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
    })


passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID_GOOGLE,
        clientSecret: process.env.CLIENT_SECRET_GOOGLE,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log("Auth done");

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));
passport.use(new FacebookStrategy({
        clientID: process.env.CLIENT_ID_FACEBOOK,
        clientSecret: process.env.CLIENT_SECRET_FACEBOOK,
        callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },


    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ facebookid: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home")
})
app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['public_profile', 'email']
}));
app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        successRedirect: '/secrets',
        failureRedirect: '/register',
        failureFlash: true //
    }));
app.get("/logout", (req, res) => {
    req.logout()
res.redirect(("/"))})
app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/register", (req, res) => {
    res.render("register")
})
app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
    res.render("submit")
    }else {
        res.render("/login")
    }
})
app.post("/submit",(req,res)=>{
    let secretMessage = req.body.secret
User.findById(req.user._id,(err,foundUser)=>{
    if(err){
        console.log(err)
    }else {
        foundUser.secret = secretMessage
        foundUser.save(function () {
            res.redirect("/secrets");
        });

    }

})

})

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
    });
app.get("/secrets",(req,res)=>{
    if (req.isAuthenticated()){
        res.render("secrets",{usersWithSecrets: ""})
    }
    else{
        res.render("login")
    }
    User.find({secret: {$ne:null}},(err,foundUser)=>{
        if(err){
            console.log(err)
        }else {
            res.render("secrets",{usersWithSecrets: foundUser})
        }

    })


})

app.post("/register", (req, res) => {
User.register({username: req.body.username}, req.body.password,(err,user)=>{
    if(err){
       console.log(err)
       res.redirect(("/register"))
    }else{
        console.log("enter here")
        passport.authenticate('local', {
            successRedirect: '/secrets',
            failureRedirect: '/register',
            failureFlash: true // allow flash messages
        })(req, res);


    }
})
})


app.post("/login", (req, res) => {
const   user = new User({
    username: req.body.username,
    password: req.body.password
})
    req.login(user,function(err){
        if(err){
            console.log(err)
        }
        else {

        }

    })

})

app.listen(3000, function () {
    console.log("Server started on port 3000");
})
