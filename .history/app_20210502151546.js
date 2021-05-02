require("dotenv").config();
const express = require("express"),
  { urlencoded } = require("body-parser"),
  ejs = require("ejs"),
  mongoose = require("mongoose"),
  session = require("express-session"),
  passport = require("passport"),
  passportLocalMongoose = require("passport-local-mongoose"),
  GoogleStrategy = require("passport-google-oauth20").Strategy,
  FacebookStrategy = require("passport-facebook").Strategy,
  findOrCreate = require("mongoose-findorcreate"),
  { GOOGLE_ID, GOOGLE_SECRET, FACEBOOK_ID, FACEBOOK_SECRET } = process.env;
// const bcrypt = require("bcrypt");

const app = express();
// const saltRounds = 10;

app.use(urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const userSchema = mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: FACEBOOK_ID,
      clientSecret: FACEBOOK_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, done) {
      const { id, displayName } = profile;
      User.findOrCreate({ facebookId: id, username: displayName }, (err, user) => {
        if (err) {
          return done(err);
        }
        done(null, user);
      });
    }
  )
);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

mongoose.set("useCreateIndex", true);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/secrets")
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "public_profile" })
);

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/secrets")
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.render("login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  User.register({ username: username }, password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = new User({
    username: username,
    password: password,
  });

  req.login(user, (err) => {
    !err
      ? passport.authenticate("local")(req, res, () => res.redirect("/secrets"))
      : console.log(err);
  });
});

// // bcrypt
// app.post("/register", (req, res) => {
//   const { username, password } = req.body;

//   bcrypt.hash(password, saltRounds, (err, hash) => {
//     const newUser = new User({
//       username: username,
//       password: hash,
//     });
//     newUser.save((err) => {
//       !err ? res.render("secrets") : console.log(err);
//     });
//   });
// });

// app.post("/login", (req, res) => {
//   const { username, password } = req.body;

//   User.findOne({ username: username }, (err, foundUser) => {
//     !err
//       ? foundUser
//         ? bcrypt.compare(password, foundUser.password, (err, result) =>
//             result === true
//               ? res.render("secrets")
//               : res.render("Password is incorrect")
//           )
//         : res.render("Username not found")
//       : console.log(err);

//     // // if normal (คำสั่ง IF แบบปกติ)
//     // if (!err) {
//     //   if (foundUser) {
//     //     bcrypt.compare(password, foundUser.password, (err, result) => {
//     //       if (result === true) {
//     //         res.render("secrets");
//     //       } else {
//     //         res.render("Password is incorrect");
//     //       }
//     //     });
//     //   } else {
//     //     res.render("Username not found");
//     //   }
//     // } else {
//     //   console.log(err);
//     // }
//   });
// });

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
