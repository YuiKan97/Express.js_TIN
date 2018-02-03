var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.json());
var mysql = require('mysql');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
//var session = require('express-session');
var passwordHash = require('password-hash');
const fileUpload = require('express-fileupload');
var fs = require('fs');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'yuikan97',
    password: '',
    database: 'c9'
});

connection.connect((err) => {
    if(err) throw err;
    console.log('Connected!');
    
});

// var adminhash = passwordHash.generate('123');
// var admin = {admin_username: 'admin', admin_password: adminhash};
// connection.query("INSERT into admin set ?", admin, (err, rows) => {
//     if(err) throw err;
//     console.log('new admin :3');
// });
// router.use(session({
//   secret: 'keyboard cat',
//   resave: false,
//   saveUninitialized: true,
//   cookie: { maxAge: 60000 }
// }));


router.use(cookieSession({
  name: 'session',
  keys: ['key1'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

router.use(fileUpload());

/* ====================== USER AREA ====================== */
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Conference' });
});

/* GET user login window. */
router.get('/login_window', function(req, res, next){
    res.render('login_window', {title: 'LOGIN' });
});

/* POST user authentication. */
router.post('/login_window', function(req, res, next) {
    var sess = req.session;
    
    var result = req.body;
    console.log(result);
    var email = result["email"];
    var password = result["password"];
    var e_mail_reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    
    if(email == "" || password == ""){
        result['result'] = "Wrong input data";
        res.json(result);
    }else if(!email.match(e_mail_reg)){
        result['result'] = "Wrong email data";
        res.json(result);
    }else {
        connection.query(`SELECT idregistered_user, user_name, user_surname, user_password FROM registered_user WHERE user_username = ${mysql.escape(email)}`, function(err, results) {
        
            var hashedPassword = results[0].user_password;

            if(passwordHash.verify(password, hashedPassword)){
            
               console.log();
                    sess.userId = results[0].idregistered_user;
                    sess.user = results[0];
                    console.log(results[0]);
                    result['result'] = "Loged In";
                    res.json(result);
                
                    //res.redirect('/dashboard');
            
            }else{
                result['result'] = "Wrong credentials";
                res.json(result);
            }
        
        });
    }
      
    
});

/* GET user dashboard, check for user session. */
router.get('/dashboard', function(req, res, next){
    
    var user = req.session.user;
    var user_id = req.session.userId;
    if(req.session.user == null){
        
        res.redirect('/login_window');
    }else{
        
        connection.query(`SELECT * from conference`, function(err, rows) {
            if(err) throw err;
            var result = "<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"6\">";
          
             rows.forEach(row => {
             result += "<tr><td width=\"17%\" valign=\"top\"><a href=\"/conference/" + row.idconference + "\"><img style=\"border:#666 1px solid;\" src=\"images/" + row.conference_pic + ".jpg\" alt= \"\" " + row.conference_title + "width=\"77\" height=\"102\" border=\"1\" /></a></td><td width=\"83%\" valign=\"top\">" + row.conference_title + "<br />" + row.conference_location + "<br /><a href=\"/register/" + row.idconference +"\">Register</a></td></tr>"; 
            });
                result += "</table>";
                
                
                res.render('dashboard', {title: 'DASHBOARD', user: user, list: result });
        });
        
    }
});

/* GET page with specific conference to observe. */
router.get('/conference/:id', function(req, res, next) {
    var user = req.session.user;
    // var user_id = req.session.userId;
    var conf_id = req.params.id;
    
    if(req.session.user == null){
        
        res.redirect('/login_window');
    }else{
        
        connection.query(`SELECT * from conference where idconference = ${mysql.escape(conf_id)}`, function(err, rows) {
            
            var conf = rows[0];
            connection.query(`SELECT * from comment where id_conference = ${mysql.escape(conf_id)}`, function(err, results) {
                
               var comments = "<p>";
               
               results.forEach(row => {
                    if(row.length == 0){
                       comments += "No comments yet";
                    }else{
                       comments += row.comment_text + " " + row.comment_date;
                    }
                   
               });
               
               comments += "</p>"; 
               
               
                res.render('conference_page', {title: "CONFERENCE PAGE", conference: conf, user: user, comments: comments});
                
            });
            
        });
        
    }
    
});

router.post('/insert_comment', function(req, res, next){
     
     var feedback = req.body.feedback;
     var date = req.body.date;
     var conf_id = req.body.conference;
     
     if(feedback == "" || date == ""){
         res.send("Wrond input data");
     }else{
         
         var comment = {comment_text: feedback, comment_date: date, id_conference: conf_id};
         connection.query(`INSERT into comment SET ?`, comment, function(err, rows){
             if(err) {
                    throw err;
                }else{
                    res.send("Was inserted successfully");
                }
         });
     }
});


router.get('/register/:id', function(req, res, next) {

    var user = req.session.user;
    var user_id = req.session.userId;
    console.log(user_id);
    var conf_id = req.params.id;
    console.log(conf_id);
    
    if(req.session.user == null){
        
        res.redirect('/login_window');
    }else{
        
        res.render('registration', {title: "REGISTRATION", user: user});
    }
});

router.post('/registration', function(req, res, next){
     var user_id = req.session.userId;
     var date = req.body.date;
     var conf_id = req.body.conference;
     
     if(date == ""){
         res.send("Wrond input data");
     }else{
         
         var registration = {idregistered_user: user_id, idconference: conf_id, date_of_regestration: date};
         connection.query('INSERT into user_conference SET ?', registration, function(err, rows){
                if(err){
                    res.send("Something went wrong");
                }else{
                    
                    res.send("Successfuly registered for conference");
                    
                }
            });
     }
});

router.get('/your_registrations', function(req, res, next) {
    var user = req.session.user;
    var user_id = req.session.userId;
    if(req.session.user == null){
        
        res.redirect('/login_window');
    }else{
        connection.query(`SELECT idconference from user_conference where idregistered_user = ${mysql.escape(user_id)}`, function(err, rows) {
            console.log("conf_user", rows[0]);
            if(rows.length > 0){
                var result = "<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"6\">";
                var command = "";
                
                    for(var i = 0; i < rows.length; i++){
                        
                        if(i != rows.length - 1){
                            
                            command += "idconference = " + rows[i].idconference + " OR "; 
                        }else{
                            command += "idconference = " + rows[i].idconference;
                        }
                    }
                    
                    connection.query(`SELECT * from conference where `+ command, function(err, results){
                        console.log("conf", results);
                        
                        if(err){
                            result += "<tr><td width=\"17%\" valign=\"top\">\"No Conferences yet\"</td></tr>";
                        }else{
                        results.forEach(row => {
                            result += "<tr><td width=\"17%\" valign=\"top\"><a href=\"/conference/" + row.idconference + "\"><img style=\"border:#666 1px solid;\" src=\"images/" + row.conference_pic + ".jpg\" alt= \"\" " + row.conference_title + "width=\"77\" height=\"102\" border=\"1\" /></a></td><td width=\"83%\" valign=\"top\">" + row.conference_title + "<br />" + row.conference_location + "<br /></td></tr>";
                        });
                            
                            result += "</table>";
                            res.render('your_registrations', {title: "MY REGISTRATIONS", user: user, result: result});
                        }
                   });
                    
            }else{
                var negative = "No conferences yet";
                res.render('your_registrations', {title: "MY REGISTRATIONS", user: user, result: negative});
            }
        });
    }
});
/* GET user signup form. */
router.get('/signup_form', function(req, res, next){
    res.render('signup_form', {title: 'SIGN UP'});
});

/* POST register user, using hashing to secure user's password. */
router.post('/signup_form', function(req, res, next){
    var result = req.body;
    console.log(result);
    var firstname = result["firstname"];
    var surname = result["surname"];
    var email = result["email"];
    var password = result["password"];
    var e_mail_reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    var name_reg = /^[A-Za-z\s\-]+$/;
    
    if(firstname == "" || surname == ""|| email == "" || password == "" || !firstname.match(name_reg) || !surname.match(name_reg)){
        result['result'] = "Wrong input data";
        res.json(result);
    }else if(!email.match(e_mail_reg)){
        result['result'] = "Wrong email data";
        res.json(result);
    }else {
        //sequring the password data
        var hashedPassword = passwordHash.generate(password);
        var user = { user_username: email, user_password: hashedPassword, user_name: firstname, user_surname: surname, user_email: email };
        
        connection.query(`SELECT user_name from registered_user where user_email = ${mysql.escape(email)}`, function(err, rows) {
            if(rows.length> 0){
                result['result'] = "Such user already exist";
                 res.json(result);
            }else{
                
                connection.query('INSERT into registered_user set ?', user, (err, rows) =>{
                    if(err) {
                        throw err;
                    }else{
                        result['result'] = "Was registered successfully";
                        res.json(result);
                    }
                });
            }
        });
    }
});

/* GET logout, clears session. */
router.get('/logout', function(req, res, next) {
    req.session = null;
    res.redirect('/');
});

/* ====================== ADMIN AREA ====================== */


/* GET admin login window. */
router.get('/admin_login', function(req, res, next) {
    res.render('admin_login', {title: 'ADMIN LOGIN'});
});

/* POST admin authentication. */
router.post('/admin_login', function(req, res, next){
    var sess = req.session;
    
    var result = req.body;
    console.log(result);
    var username = result["username"];
    var password = result["password"];
    
    if(username == "" || password == ""){
        result['result'] = "Wrong input data";
        res.json(result);
    }else {
        connection.query(`SELECT idAdmin, admin_username, admin_password FROM admin WHERE admin_username = ${mysql.escape(username)}`, function(err, results) {
            
            if(results.length > 0){
                
                var hashedPassword = results[0].admin_password;
                
                if(passwordHash.verify(password, hashedPassword)){
                
                   console.log();
                        sess.adminId = results[0].idAdmin;
                        sess.admin = results[0];
                        result['result'] = "Loged In";
                        res.json(result);
                    
                }else{
                    result['result'] = "Wrong credentials";
                    res.json(result);
                }
            }else{
                    result['result'] = "No such admin";
                    res.json(result);
            }
        
        
        });
    }
});

/* GET admin dashboard, check for admin session. */
router.get('/admin_area', function(req, res, next){
    
    var admin = req.session.admin;
    if(admin == null){
        
        res.redirect('/admin_login');
    }else{
        res.render('admin_area', {title: 'ADMIN AREA', admin: admin });
    }
});

/* GET a list with all users to perform further delete, check for admin session. */
router.get('/all_users', function(req, res, next) {
     var admin = req.session.admin;
    if(admin == null){
        
        res.redirect('/admin_login');
    }else{
        
     connection.query('SELECT * from registered_user', function (err, rows){
        if(err) throw err;
        var results = "<select id='idregistered_user'>";
        
        rows.forEach(row => {
            results += "<option value = " + row.idregistered_user + " >" + row.user_name + " " + row.user_surname + "</option>"; 
        });
        
        results += "</select>";
        res.render('all_users', {title: "DELETE USER", selected: results});
        
    });
    }
});

/* POST delete registered user. */
router.post('/delete', function(req, res, next){
    
    var result = req.body;
    console.log(result);
    var iduser = parseInt(result["idregistered_user"]);
 
    if(isNaN(iduser)){
        result['result'] = "Wrong id";
        res.json(result);
    }else{
        
        connection.query(`DELETE from registered_user Where idregistered_user = ${mysql.escape(iduser)}`, function (err, rows){
            if (err) {
                result['result'] = "Delete was not successful";
                res.json(result);
            } else {
            result['result'] = "Was deleted successfully";
                res.json(result);
            }
        });
        
    }
});

/* GET form for inserting a new conference to the database */
router.get('/insert_conference', function(req, res, next){
     var admin = req.session.admin;
    if(admin == null){
        
        res.redirect('/admin_login');
    }else{
        
        res.render('insert_conference', {title: "INSERT CONFERENCE"});
        
    }
});

/* POST inserting a new conf. */
router.post('/insert_conference', function(req, res, next) {
    
    
    if (!req.files){
        console.log('no files');
    }
 
    var image = req.files.image;
    var fileName = req.body.fileName;
    console.log(__dirname);
    var rn = Math.floor((Math.random() * 1000) + 1);
    var path = "/home/ubuntu/workspace/project/MyApp/public/images/" + fileName + '.jpg';
    if (fs.existsSync(path)){
        fileName = fileName + "" + rn;
    }
    image.mv('/home/ubuntu/workspace/project/MyApp/public/images/' + fileName + '.jpg', function(err) {
        if (err){
            console.log('err');
        }else{
            
         console.log('successful');
         
            
            var result = req.body;
            console.log(result);
            var title = result.title;
            var date = result.date;
            var location = result.locat;
            var description = result.descr;
            
            if(title == "" || date == "" || location == "" || description == ""){
                res.send('Wrong input!');
            }else{
                var conference = { conference_title: title, conference_date: date, conference_location: location, conference_desc: description, conference_pic: fileName };
                connection.query('INSERT into conference set ?', conference, (err, rows) =>{
                    if(err) {
                        throw err;
                    }else{
                        res.send('Was successfully inserted!');
                    }
                });
            }
        }
 
    });
    
});

/* GET list with conferences for further delete. */
router.get('/delete_conference', function(req, res, next) {
     var admin = req.session.admin;
    if(admin == null){
        
        res.redirect('/admin_login');
    }else{
        
     connection.query('SELECT * from conference', function (err, rows){
        if(err) throw err;
        var results = "<select id='idconference'>";
        
        rows.forEach(row => {
            results += "<option value = " + row.idconference + " >" + row.conference_title + " " + row.conference_date + "</option>"; 
        });
        
        results += "</select>";
        res.render('delete_conference', {title: "DELETE CONFERENCE", selected: results});
        
    });
    }
});

/* POST delete a conf, delete pic of conf from project. */
router.post('/delete_conference', function(req, res, next){
    
    var result = req.body;
    console.log(result);
    var idconference = parseInt(result["idconference"]);
 
    if(isNaN(idconference)){
        result['result'] = "Wrong id";
        res.json(result);
    }else{
        var img;
        connection.query(`SELECT conference_pic from conference where idconference = ${mysql.escape(idconference)}`, function(err, results){
            if(err){
                
                throw err;
            } else{
                
                img = results[0].conference_pic;
                
                connection.query(`DELETE from conference Where idconference = ${mysql.escape(idconference)}`, function (err, rows){
                    if (err) {
                        result['result'] = "Delete was not successful";
                        res.json(result);
                    } else {
                        
                        fs.unlink('/home/ubuntu/workspace/project/MyApp/public/images/' + img + '.jpg', function(error) {
                            if (error) {
                                throw error;
                            }
                            console.log('Deleted successfully');
                        });
                        
                        result['result'] = "Was deleted successfully";
                        res.json(result);
                    }
                });
            }
        });
        
    }
});


/* GET list with conferences for further update. */
router.get('/all_conferences_list', function(req, res, next) {
     var admin = req.session.admin;
    if(admin == null){
        
        res.redirect('/admin_login');
    }else{
        
     connection.query('SELECT * from conference', function (err, rows){
        if(err) throw err;
        var results = "<select id='idconference'>";
        
        rows.forEach(row => {
            results += "<option value = " + row.idconference + " >" + row.conference_title + " " + row.conference_date + "</option>"; 
        });
        
        results += "</select>";
        res.render('all_conferences_list', {title: "UPDATE CONFERENCE", selected: results});
        
    });
    }
});


/* POST update a conf, delete old pic of conf from project and insert a new one. */
router.post('/all_conferences_list', function(req, res, next){
    
     
    var result = req.body;
    console.log(result);
    
    var title = result.title;
    var date = result.date;
    var location = result.locat;
    var description = result.descr;
    var idconference = parseInt(result.idconference);
    var image = req.files.image;
    var fileName = req.body.fileName;
 
    if(isNaN(idconference)){
        result = "Wrong id";
        res.send(result);
    }else{
        var img;
        connection.query(`SELECT conference_pic from conference where idconference = ${mysql.escape(idconference)}`, function(err, results){
            if(err){
                
                throw err;
            } else{
                
                img = results[0].conference_pic;
                
                fs.unlink('/home/ubuntu/workspace/project/MyApp/public/images/' + img + '.jpg', function(error) {
                    if (error) {
                        throw error;
                    }
                
                    console.log('Deleted successfully');
                });
                var rn = Math.floor((Math.random() * 1000) + 1);
                var path = "/home/ubuntu/workspace/project/MyApp/public/images/" + fileName + '.jpg';
                if (fs.existsSync(path)){
                    fileName = fileName + "" + rn;
                }
                connection.query(`UPDATE conference SET conference_title = ${mysql.escape(title)}, conference_date = ${mysql.escape(date)}, conference_location = ${mysql.escape(location)}, conference_desc = ${mysql.escape(description)}, conference_pic = ${mysql.escape(fileName)} Where idconference = ${mysql.escape(idconference)}`, function (err, rows){
                    if (err) {
                        result = "Update was not successful";
                        res.send(result);
                    } else {
                        
                        
                        image.mv('/home/ubuntu/workspace/project/MyApp/public/images/' + fileName + '.jpg', function(err) {
                            if (err){
                                console.log('err to upload file');
                            }else{
            
                                console.log('successful');
                            }
                        });
                        result = "Update was successful";
                        res.send(result);
                    }
                });
            }
        });
        
    }
});
module.exports = router;
