var mysql = require('mysql');
var passwordHash = require('password-hash');

var connection = mysql.createConnection({
  host     : '18.111.114.209',
  user     : 'root',
  password : ''
});
initDatabase = function() { // in case tables don't exist yet
  var commands = ['create database if not exists clam;',
  'create table if not exists clam.open(gid varchar(10), game_info varchar(10000));',
  'create table if not exists clam.active(gid varchar(10), game_info varchar(10000));',
  'create table if not exists clam.finished(gid varchar(10), game_info varchar(10000));',
  'create table if not exists clam.users(username varchar(30), password varchar(100));'];
  for (var command of commands) {
    connection.query(command);
  }
}

print = console.log.bind(console);

connection.connect();
initDatabase();

var games = {};
var open_games = {};
var finished_games = {};
var count = 0;
var APPLY_CHANGES_FREQ = 10;
var DATABASE = 'clam';
var users = {};

loadData();

function randomString(length) {
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

function newGameId(){
  var newId = randomString(6);
  if(!(newId in games) && !(newId in open_games) && !(newId in finished_games)){
    return newId;
  }
  return newGameId();
}

function listGames(){
  games_info = {};
  for(game in games)
    games_info[game] = {'usernames':games[game]['usernames'], 'host':games[game]['host']};
  return games_info;
}

function listOpenGames(){
  games_info = {};
  for(game in open_games)
    games_info[game] = {'usernames':open_games[game]['usernames'], 'host':open_games[game]['host']};
  return games_info;
}

function listFinishedGames(){
  games_info = {};
  for(game in finished_games)
    games_info[game] = {'usernames':finished_games[game]['usernames'], 'host':finished_games[game]['host']};
  return games_info;
}

function loadData(){
  connection.query('SELECT * FROM '+DATABASE+'.ACTIVE;', function(err, rows, fields){
    if(err) throw err;
    games = {}
    for(row of rows){
      var gid = row.gid;
      var game_info = JSON.parse(row.game_info);
      game_info.sockets = fillArray(null, game_info['usernames'].length);
      games[gid] = game_info;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.OPEN;', function(err, rows, fields){
    if(err) throw err;
    open_games = {}
    for(row of rows){
      var gid = row.gid;
      var game_info = row.game_info;
      print ('parsing ', game_info);
      game_info = JSON.parse(row.game_info);
      game_info.sockets = [];
      open_games[gid] = game_info;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.FINISHED;', function(err, rows, fields){
    if(err) throw err;
    finished_games = {};
    for(row of rows){
      var gid = row.gid;
      var game_info = row.game_info.replace(/\n/, '\\n');
      game_info = JSON.parse(game_info);

      finished_games[gid] = game_info;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.USERS', function(err, rows, fields){
    if(err) throw err;
    users = {};
    for(row of rows){
      users[row.username] = {'password':row.password};
    }
  });
}

function saveGame(table, game, gid){
  // table can be "active", "open", or "finished"
  game = JSON.stringify({
    'game_info': game.game_info,
    'true_cards': game.true_cards,
    'public_gs': game.public_gs,
    'private_gs': game.private_gs,
    'usernames': game.usernames,
    'host': game.host
  });
  game = game.replace("'", "\\\'");

  connection.query("SELECT COUNT(*) FROM "+DATABASE+"."+table+" WHERE gid = '" + gid + "';", function(err, result){
    if(err) throw err;
    if(result[0]['COUNT(*)'] == 0){
      connection.query("INSERT INTO "+DATABASE+"."+table+"\n VALUES ('"+gid+"', '"+game+"');", function(err, result){
        if(err) throw err;
      });
    }else{
      connection.query("UPDATE "+DATABASE+"."+table+"\n SET game_info='"+game+"'\n WHERE gid='"+gid+"';", function(err, result){
        
        if(err) throw err;
      });
    }
  });
}

function deleteGame(table, gid){
  // table can be "active", "open", or "finished"
  connection.query("DELETE FROM "+DATABASE+"."+table+"\nWHERE gid='"+gid+"';", function(err, result){
    if(err) throw err;
  });
}

function authenticate(username, password){
  if (!(username in users))
    return false;
  return passwordHash.verify(password, users[username].password);
}

function createUser(username, password){
  if (username in users)
    return "Username has been taken.";
  if (username.match("^[a-zA-Z0-9_]+$") == null)
    return "Username must be alphanumeric characters.";
  if(password.length < 6)
    return "Password must be at least 6 characters."

  var hashedPassword = passwordHash.generate(password);
  users[username] = {'password':hashedPassword};
  

  connection.query("INSERT INTO "+DATABASE+".users\n VALUES('"+username+"', '"+hashedPassword+"');", function(err, result){
    if(err) throw err;
  });
  return "success";
}

module.exports = function(server){
  var io = require('socket.io')(server);

  io.on('connection', function(socket){
    var username = null;
    var pid = null;
    var gid = null;
    var num_players = null;
    var num_colors = null;
    var num_ranks = null;
    var game_info = null;
    var true_cards = null;
    var public_gs = null;
    var private_gs = null;
    var sockets = null;
    var players = null;
    var view = 'login';

    socket.emit('connection', 'user connected');

    socket.on('login', function(user_info) {
      var _username = user_info['username'];
      var _password = user_info['password'];

      if(view != 'login') {
        socket.emit('login error', 'invalid view');
        return;
      }

      if (username != null) {
        socket.emit('login error', 'already logged in');
        return;
      } 
      if (_username == '') {
        socket.emit('login denied', 'invalid username or password');
        return;
      }

      if (!authenticate(_username, _password)){
        socket.emit('login denied', 'invalid username or password');
        return;
      }

      view = 'lobby';
      username = _username;
      socket.emit('login success', {
        'username': username,
        'games': listGames(),
        'openGames': listOpenGames()
      });
    });

    socket.on('user_register', function(user_info){
      var _username = user_info['username'];
      var _password = user_info['password'];

      if(view != 'login') {
        socket.emit('user_register error', 'invalid view');
        return;
      }

      if (username != null) {
        socket.emit('user_register error', 'already logged in');
        return;
      } 

      if(_username == '') {
        socket.emit('user_register denied', 'invalid username or password');
        return;
      }

      var message = createUser(_username, _password);
      if(message == "success"){
        socket.emit('user_register success', {'username':_username, 'password':_password});
      } else{
        socket.emit('user_register denied', message);
      }
    });

    socket.on('create', function(ginfo){
      if(view != 'lobby') {
        socket.emit('create error', 'invalid view');
        return;
      }

      if(!(ginfo instanceof Object) || !('num_players' in ginfo) 
         || !('num_colors' in ginfo) || !('num_ranks' in ginfo)
         || isNaN(ginfo['num_players']) || isNaN(ginfo['num_colors']) 
         || isNaN(ginfo['num_ranks']) || ginfo['num_players'] <= 1 
         || ginfo['num_colors'] <= 0 || ginfo['num_ranks'] <= 0){
        socket.emit('create error', 'invalid input');
      return;
      }
      var game = initialize(ginfo['num_players'], ginfo['num_colors'], ginfo['num_ranks'], true);
      var id = newGameId();
      open_games[id] = game;
      open_games[id]['host'] = username;

      io.sockets.emit('updateGameList', {
        'games': listGames(),
        'openGames': listOpenGames()
      });

      socket.emit('create success', id);
      saveGame('open', game, id);
    });

    socket.on('join', function(_gid){
      if(view != 'lobby') {
        socket.emit('join error', 'invalid view');
        return;
      }

      if(!(_gid in open_games)){
        socket.emit('join error', 'invalid gid');
        return;
      }

      gid = _gid;

      open_games[gid]['sockets'].push(socket);

      view = 'wait';
      socket.emit('join success', {
        'game_info': open_games[gid]['game_info'],
        'host': open_games[gid]['host'],
        'usernames': open_games[gid]['usernames'],
        'gid': gid
      });
    });

    socket.on('register', function(_gid){
      if(view != 'lobby' && view != 'wait') {
        socket.emit('register error', 'invalid view');
        return;
      }

      if(!(_gid in games)) {
        socket.emit('register error', 'invalid game_id');
        return;
      }

      gid = _gid;
      var game = games[gid];

      if(game['usernames'].indexOf(username) == -1) {
        socket.emit('register error', 'invalid user');
        return;
      }

      pid = game['usernames'].indexOf(username);
      game_info = game['game_info'];
      true_cards = game['true_cards'];
      public_gs = game['public_gs'];
      private_gs = game['private_gs'];
      sockets = game['sockets'];
      num_players = game_info['num_players'];
      num_colors = game_info['num_colors'];
      num_ranks = game_info['num_ranks'];
      players = game['usernames'];
      
      // register socket with player id
      sockets[pid] = socket;

      view = 'game';
      socket.emit('register success', {
        'pid':pid,
        'gid':gid,
        'game_info':game_info, 
        'public':public_gs, 
        'private':private_gs['cards'][pid],
        'players':players,
      });
    });

    socket.on('logout', function(){
      if (view == 'login') {
        socket.emit('logout error', 'invalid view');
        return;
      }

      if(view == 'game') {
        sockets[pid] = null;
      } else if(view == 'wait') {
        open_games[gid]['sockets'].remove(socket);
      }

      username = null;
      gid = null;
      pid = null;
      view = 'login';

      socket.emit('logout success');
    });
    
    socket.on('add_user', function(pid){
      if (view != 'wait') {
        socket.emit('add_user error', 'invalid view');
        return;
      }

      if (pid >= open_games[gid]['game_info']['num_players']) {
        socket.emit('add_user error', 'invalid pid');
        return;
      }
      var usernames = open_games[gid]['usernames'];

      if (usernames.indexOf(username) != -1)
        if(usernames[pid] != null)
          usernames[usernames.indexOf(username)] = usernames[pid];
        else 
          usernames[usernames.indexOf(username)] = null;

      usernames[pid] = username;

      for (user of open_games[gid]['sockets']) {
        user.emit('wait update', {
          'gid':gid,
          'game_info': open_games[gid]['game_info'],
          'host': open_games[gid]['host'],
          'usernames': open_games[gid]['usernames']
        });
      }

      saveGame('open', open_games[gid], gid);
    });

    socket.on('start', function(){
      if(view != 'wait') {
        socket.emit('start error', 'invalid view');
        return;
      }
      if(!(gid in open_games)){
        socket.emit('start error', 'game not open');
        return;
      }
      var game = open_games[gid];
      if(username != game['host']){
        socket.emit('start error', 'user not host');
        return;
      }
      for (name of game['usernames']){
        if (name == null){
          socket.emit('start error', 'unfilled positions');
          return;
        }
      }
      var connected_users = game['sockets'];
      game['sockets'] = fillArray(null, game['usernames'].length);
      games[gid] = game;
      delete open_games[gid];

      for (user of connected_users) {
        user.emit('start', {
          'gid': gid,
          'usernames': game['usernames']
        });
      }
      deleteGame('open', gid);
      saveGame('active', game, gid);
    });

    socket.on('wait', function(){
      if(view != 'wait') {
        socket.emit('wait error', 'invalid view');
        return;
      }
      socket.emit('wait update', {
        'gid':gid,
        'game_info': games[gid]['game_info'],
        'host': games[gid]['host'],
        'usernames': games[gid]['usernames']
      });
    });

    socket.on('wait_back', function(){
      if(view != 'wait') {
        socket.emit('wait_back error', 'invalid view');
        return;
      }

      open_games[gid]['sockets'].remove(socket);
      gid = null;
      view = 'lobby';
      socket.emit('wait_back success', {
        'games': listGames(),
        'openGames': listOpenGames()
      });
    });

    socket.on('guess', function(guess){
      if(view != 'game') {
        socket.emit('guess error', 'invalid view');
        return;
      }
      // guess is {target_id, target_card, rank}
      if(pid == null){
        // checks that socket has registered as player
        socket.emit('guess error', 'pid undefined');
        return;
      }

      if(!(guess instanceof Object) || !('target_id' in guess) || !('target_card' in guess) || !('rank' in guess)
        || isNaN(guess['target_id']) || isNaN(guess['target_card']) || isNaN(guess['rank'])){
        socket.emit('guess error', 'invalid input');
        return;
      }

      if(public_gs['phase'] != 'guess' || public_gs['turn'] != pid){
        // checks that it's player's turn
        socket.emit('guess error', 'out of turn');
        return;
      }
      if(pid == guess['target_id'] || guess['target_id'] >= num_players){
        //checks that player does not target self
        socket.emit('guess error', 'invalid person');
        return;
      }
      if(game_info['has_teams'] && (guess['target_id'] - pid)%num_players == num_players/2){
        // checks that player does not target teammate
        socket.emit('guess error', 'invalid person');
        return;
      }

      var target_id = guess['target_id'];
      var card = guess['target_card'];
      var rank = guess['rank'];
      var cards = public_gs['cards'];
      var private_cards = private_gs['cards'];

      if(card >= cards[0].length || rank > num_ranks) {
        // checks that card pos and rank are valid
        socket.emit('guess error', 'invalid card');
        return;
      }
      if(cards[target_id][card]['visible']){
        // checks that target card has not been revealed
        socket.emit('guess error', 'card already revealed');
        return;
      }
      
      if(true_cards[target_id][card]['rank'] == rank){
        // guess is correct
        // updates public gamestate
        cards[target_id][card]['rank'] = rank;
        cards[target_id][card]['visible'] = true;
        for(i = 0; i < num_players; ++i) {
          // updates private gamestates
          private_cards[i][target_id][card]['rank'] = rank;
          private_cards[i][target_id][card]['visible'] = true;
          private_cards[i][target_id][card]['flipped'] = true;
        }

        var message = players[pid]+' CORRECTLY guessed card '+(card+1)+' of '+players[target_id]+"'s hand as "+rank;
        // updates guess history
        public_gs['history'].push({
          'move':'guess',
          'id':pid, 
          'target_id':target_id, 
          'card':card, 
          'rank':rank, 
          'correct':true, 
          'message': message});
        public_gs['turn'] = (public_gs['turn']+1)%num_players;
        public_gs['phase'] = 'pass';
      } else {
        // guess is incorrect

        var message = players[pid]+' INCORRECTLY guessed card '+(card+1)+' of '+players[target_id]+"'s hand as "+rank;
        // updates guess history
        public_gs['history'].push({
          'move':'guess',
          'id':pid, 
          'target_id':target_id, 
          'card':card, 
          'rank':rank, 
          'correct':false, 
          'message':message});
        public_gs['phase'] = 'flip';
      }
      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('guess success', {
            'pid':pid,
            'gid':gid,
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i],
            'players':players,
          });
      }
      saveGame('active', games[gid], gid);
    });

    socket.on('pass', function(pass){
      // pass is {card}

      if(view != 'game') {
        socket.emit('pass error', 'invalid view');
        return;
      }

      if(pid == null){
        socket.emit('pass error', 'pid undefined');
        return;
      }

      if(!(pass instanceof Object) || !('card' in pass) || isNaN(pass['card'])) {
        socket.emit('pass error', 'invalid input');
        return;
      }

      if(!game_info['has_teams']){
        socket.emit('pass error', 'teammates off');
        return;
      }

      var passer_id = (public_gs['turn']+num_players/2)%num_players;
      if(public_gs['phase'] != 'pass' || passer_id != pid){
        // checks that it's player's turn
        socket.emit('pass error', 'out of turn');
        return;
      }

      var card = pass['card'];

      if(card >= true_cards[0].length) {
        // checks that card is valid
        socket.emit('pass error', 'invalid card');
        return;
      }
      
      var rank = true_cards[pid][card]['rank'];
      // updates private gamestate
      private_gs['cards'][public_gs['turn']][pid][card]['rank'] = rank;
      private_gs['cards'][public_gs['turn']][pid][card]['visible'] = true;

      var message = players[pid]+' passed card '+(card+1)+' to '+players[public_gs['turn']];
      // updates pass history
      public_gs['history'].push({'move':'pass','id':public_gs['turn'], 'card':card, 'message':message});
      public_gs['phase'] = 'guess';

      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('pass success', {
            'pid':pid,
            'gid':gid,
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i],
            'players':players,
          });
      }
      saveGame('active', games[gid], gid);
    });

    socket.on('flip', function(flip){
      // flip is {card}

      if(view != 'game') {
        socket.emit('flip error', 'invalid view');
        return;
      }

      if (pid == null){
        socket.emit('flip error', 'pid undefined');
        return;
      }

      if(!(flip instanceof Object) || !('card' in flip) || isNaN(flip['card'])) {
        socket.emit('flip error', 'invalid input');
        return;
      }

      if(public_gs['phase'] != 'flip' || public_gs['turn'] != pid){
        // checks that it's player's turn
        socket.emit('flip error', 'out of turn');
        return;
      }

      var card = flip['card'];

      if(card >= true_cards[0].length) {
        // checks that card is valid
        socket.emit('flip error', 'invalid card');
        return;
      }

      var cards = public_gs['cards'];
      if(cards[pid][card]['visible']){
        // checks that card is not already flipped
        socket.emit('flip error', 'card already revealed');
        return;
      }

      var rank = true_cards[pid][card]['rank'];
      
      // updates public gamestate
      cards[pid][card]['rank'] = rank;
      cards[pid][card]['visible'] = true;
      var private_cards = private_gs['cards'];
      for(i = 0; i < num_players; ++i) {
        // updates private gamestates
        private_cards[i][pid][card]['rank'] = rank;
        private_cards[i][pid][card]['visible'] = true;
        private_cards[i][pid][card]['flipped'] = true;
      }

      // updates guess history
      var message = players[pid]+' flipped card '+(card+1);
      public_gs['history'].push({
        'move':'flip',
        'id':pid, 
        'card':card, 
        'rank':rank, 
        'message':message
      })
      public_gs['turn'] = (public_gs['turn']+1)%num_players;
      public_gs['phase'] = 'pass';

      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('flip success', {
            'pid':pid,
            'gid':gid,
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i],
            'players':players,
          });
      }
      saveGame('active', games[gid], gid);
    });
    
    socket.on('clam', function(guess){
      // guess is in pid order [[1,2,3,4,5,6],[7,8,9,10,11,12],...]
      print('received clam', guess);
      if (view != 'game'){
        socket.emit('claim error', 'invalid view');
        return;
      }
      if (public_gs.phase == 'over') {
        return;
      }
      print('computing winner');
      var winner = pid%2;
      for (i = 0; i < num_players; ++i){
        for (j = 0; j < true_cards[0].length; ++j){
          if(guess[i][j] != true_cards[i][j]['rank']){
            winner = 1 - winner;
            break;
          }
        }
        if(winner != pid%2)
          break;
      }
      public_gs['winner'] = winner;
      public_gs['phase'] = 'over';
      print('winner=', winner);
      var message = "";
      if(winner == pid%2){
        message = players[pid]+' claims successfully!\n'+players[pid]+' and '+players[(pid+2)%num_players]+' WIN :)';
      }else{
        message = players[pid]+' claims incorrectly!\n'+players[(pid+1)%num_players]+' and '+players[(pid+3)%num_players]+' WIN :)';
      }
      public_gs['history'].push({
        'move':'claim',
        'id':pid,
        'winner':pid%2,
        'message':message
      })
      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('claim success', {
            'gid':gid,
            'game_info':game_info,
            'public':public_gs,
            'true_cards':true_cards,
            'players':players,
          });
      }

      finished_games[gid] = games[gid];
      delete finished_games[gid]['sockets'];
      delete games[gid];
      saveGame('finished', finished_games[gid], gid);
      deleteGame('active', gid);
    });

    socket.on('game_back', function(){
      if(view != 'game') {
        socket.emit('game_back error', 'invalid view');
        return;
      }

      sockets[pid] = null;
      gid = null;
      pid = null;
      view = 'lobby';
      socket.emit('game_back success', {
        'games': listGames(),
        'openGames': listOpenGames()
      });
    })

    socket.on('disconnect', function(){
      if(view == 'game') {
        sockets[pid] = null;
      } else if(view == 'wait') {
        open_games[gid]['sockets'].remove(socket);
      }
    });
  });
  
}

// creates a clone of an array
function cloneObj(obj) {
    function clone(o, curr) {
        for (var l in o){
            if (o[l] instanceof Object) {
                curr[l] = cloneObj(o[l]);
            } else {
                curr[l] = o[l];
            }
        }
        return curr;
    }

    return obj instanceof Array 
             ? obj.slice().map( function (v) { return cloneObj(v); } )
             : obj instanceof Object 
               ? clone(obj, {})
               : obj;
}

// creates array of length 'len' with values 'value'
function fillArray(value, len) {
  var arr = [];
  for (i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

// shuffles array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// generates a new list of cards
function generateCards(num_colors, max_rank, num_players) {
  if (max_rank*num_colors % num_players != 0)
    throw 'Card numbers do not match.'

  var deck = [];
  for (i = 1; i <= num_colors; ++i)
    for (j = 1; j <= max_rank; ++j)
      deck.push({'rank':j, 'color':i});

  shuffle(deck);

  var cards = [];
  var hand_size = max_rank*num_colors/num_players;
  for (i = 0; i < num_players; ++i){
    var hand = deck.slice(hand_size*i, hand_size*(i+1));
    hand.sort(function(a, b){return a['rank'] - b['rank']});
    cards.push(hand);
  }

  return cards;
}

// initializes game info, and public and private gamestates
function initialize(num_players, num_colors, num_ranks, has_teams){
  var game_info = {
    'num_players':num_players,
    'num_colors':num_colors,
    'num_ranks':num_ranks,
    'has_teams':has_teams,
    'statuses':fillArray('off', num_players),
    'chat_log':[]
  };
  
  var true_cards = generateCards(num_colors, num_ranks, num_players);

  var public_gs = {
    'turn': 0,
    'phase': 'pass',
    'cards': [],
    'history': [{'move':'start', 'message':'Welcome to Clam!'}],
    'winner': false
  };

  var private_gs = {
    'cards': []
  }

  var sockets = [];
  var usernames = fillArray(null, num_players);

  for(i = 0; i < true_cards.length; ++i) {
    var hand = [];
    for(j = 0; j < true_cards[0].length; ++j) {
      hand.push({'rank':0, 'color':true_cards[i][j]['color'], 'visible':false});
    }
    public_gs['cards'].push(hand);
  }

  for(i = 0; i < num_players; ++i) {
    var cards = true_cards;
    var player_cards = [];
    for(j = 0; j < cards.length; ++j) {
      var hand = [];
      if(i == j) 
        for (k = 0; k < cards[j].length; ++k)
          hand.push({'rank':cards[j][k]['rank'], 'color':cards[j][k]['color'], 'visible':true, 'flipped':false});
      else 
        for (k = 0; k < cards[j].length; ++k) 
          hand.push({'rank':0, 'color':cards[j][k]['color'], 'visible':false, 'flipped':false});
      player_cards.push(hand);
    }
    private_gs['cards'].push(player_cards);
  }

  return {
    'game_info': game_info,
    'true_cards': true_cards,
    'public_gs': public_gs,
    'private_gs': private_gs,
    'sockets': sockets,
    'usernames': usernames,
    'host': null
  }
}
