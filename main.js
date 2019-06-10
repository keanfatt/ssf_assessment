const hbs = require('express-handlebars')
const express = require('express')
const mysql = require('mysql')
const config = require('./config.json');

//Configure PORT
const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

//Create an MySQL connection pool
const bggPool = mysql.createPool(config.bgg)

//Create an instance of the application
const app = express();


//Configure handlebars
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
//This is optional because views is the default directory
app.set('views', __dirname + '/views');

////////////////////////////////////////////////////////////////////////
//SQL statements
const SQL_SELECT_GAMES_WHERE = 
    'select gid, name from game where name like ?';

const SQL_SELECT_GAMEID_WHERE = 
    'select name, year,ranking, users_rated, url, image from game where gid = ?';

const SQL_SELECT_COMMENT_WHERE = 
    'select user, rating,c_text, gid from comment where gid = ?';


//Promises
const mkQuery = (sql, pool) => {
    return ((params) => {
        const p = new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err)
                    return reject(err);
                conn.query(sql, params || [], (err, result) => {
                    conn.release()
                    if (err)
                        return reject(err);
                    resolve(result);
                })
            })
        })
        return (p);
    });
}

const selectGames = mkQuery(SQL_SELECT_GAMES_WHERE, bggPool);
const selectGameId = mkQuery(SQL_SELECT_GAMEID_WHERE, bggPool);
const selectComment = mkQuery(SQL_SELECT_COMMENT_WHERE, bggPool);

//Routes
app.get('/search', (req, resp)=>{
    const q = req.query.q;    

    Promise.all([ selectGames([`%${q}%`])])
    .then(result => {

        resp.status(200);
        resp.type('text/html');
        resp.render('search', { 
            noResult: result[0].length <= 0, 
            gameName:q,
            games: result[0],
            layout: false 
        });
    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })

})

app.get('/details', (req, resp)=>{
    const q = req.query.q;    

    Promise.all([ selectGameId([`${q}`]), selectComment([`${q}`])])
    .then(result => {

        //console.log(result[1]);

        resp.status(200);
        resp.type('text/html');
        resp.render('details', { 
            gameDetails: result[0][0],
            comments: result[1],
            layout: false 
        });
    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })

})


////////////////////////////////////////////////////////////////////////
app.get(/.*/, express.static(__dirname + '/public'))

//Error
app.use((req, resp) =>{
    resp.status(404);
    resp.type('text/html');
    resp.sendFile(__dirname + '/public/404.html');
    
    })

app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
});