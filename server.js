import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = new URL(process.env.DATABASE_URL);

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbUrl.pathname.substr(1)
    }
});

db.select('*').from('users').then(data => {
    console.log(data);
})

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req,res)=>{
    res.send(database.users)
})

app.post("/signin", (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if(isValid){
                db.select('*').from('users')
                .where('email', '=', req.body.email)
                .then(user => {
                    res.json(user[0])
                })
                .catch(err => res.status(400).json("unable get user"))
            }
        })
        .catch(err => res.status(400).json("wrong credencials"))
})

app.post("/register", (req,res) => {
    const {name, email, password} = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(function(loginEmail){
            console.log("Inserted into login table: ", loginEmail);
            trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0].email,
                name: name,
                joined: new Date()
            })
            .then(user => {
                console.log('Resolve user: ',user);
                res.json(user[0])
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => {
        res.status(400).json('unable to register');
    });
})

app.get("/profile/:id", (req,res)=>{
    const {id} = req.params;
    db.select('*').from('users').where({id})
    .then(user =>{
        if(user.length){
            res.json(user[0]);
        }else{
            res.status(400).json('Not found')
        }
    })
})

app.put("/image", (req,res)=>{
    const {id} = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})

app.listen(port, ()=>{
    console.log("Server is running on port: ", port);
})