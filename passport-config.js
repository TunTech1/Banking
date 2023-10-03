const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcrypt")
const collection = require("./mongodb")



         // Function to authenticate users
function authenticateUsers(getUserByEmail, done) {
    return async (email, password, done) => {   
        // Get users by email
        const user = await getUserByEmail(email)
        if (user == null){
            return done (null, false, {message: "No user found"})
        }
        try {
            if(await bcrypt.compare(password, user.password)){
                return done(null, user)
            }else{
                return done (null, false, {message: "Password Incorrect"})
            }
        } catch (e) {
            console.log(e);
            return done(e)
        }
    }
}


function initialize(passport, getUserByEmail, getUserById) {
    passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUsers(getUserByEmail)))
    passport.serializeUser((user, done) => done(null, user._id))
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id);
            done(null, user);
        } catch (err) {
            console.error(err);
            done(err);
        }
    });
}

module.exports = initialize;