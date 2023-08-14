const express = require('express');
const app = express();

const http = require('http').Server(app);
const cors = require('cors');


const router = require('./routes/index.js');

var session = require('express-session');


app.use(express.urlencoded());

// use sessions to secure app
app.use(session(
  { 
    secret: "SECRET KEY!",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60000,
      secure: false
    },
}))

// use CORS to allow cross-origin requests and restrict the type of HTTP methods
app.use(cors(
  {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true

  }
));

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// const socketIO = require('socket.io')(http, {
//   cors: {
//       origin: "http://localhost:3000"
//   }
// });

const socketIO = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
});


socketIO.on('connection', (socket) => {
  console.log(`${socket.id} user just connected!`);

  //sends the message to all the users on the server
  socket.on('message', (data) => {
    socketIO.emit('messageResponse', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});



app.use('/api', (req, res, next) => {

    next();
  }, router);


/* Run the server */
// app.listen(8080);
http.listen(8080);
console.log('Server running on port 8080. Now open http://localhost:8080/ in your browser!');

