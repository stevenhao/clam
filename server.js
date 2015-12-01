var mysql = require('mysql');
var passwordHash = require('password-hash');
var Game = require('./game');
var Utils = require('./utils');

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

function handleDisconnect() {
  connection = mysql.createConnection({
    host     : process.env.DB_URL || 'localhost',
    user     : process.env.DB_USER || 'root',
    password : process.env.DB_PASSWORD || ''
  });
  
  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

initDatabase = function() { // in case tables don't exist yet
  var commands = ['create database if not exists clam;',
  'create table if not exists clam.OPEN(gid varchar(50), game_info varchar(10000));',
  'create table if not exists clam.ACTIVE(gid varchar(50), game_info varchar(10000));',
  'create table if not exists clam.FINISHED(gid varchar(50), game_info varchar(10000));',
  'create table if not exists clam.USERS(username varchar(30), password varchar(100));'];
  for (var command of commands) {
    connection.query(command);
  }
}

print = console.log.bind(console);
initDatabase();

var games = {};
var open_games = {};
var finished_games = {};
var count = 0;
var APPLY_CHANGES_FREQ = 10;
var DATABASE = 'clam';
var users = {};

loadData();

function newGameId() {
  var newId = Utils.randomWords(2);
  if(!(newId in games) && !(newId in open_games) && !(newId in finished_games)) {
    return newId;
  }
  return newGameId();
}

function listGames() {
  games_info = {};
  for(var game in games)
    games_info[game] = {'usernames':games[game].getUsernames(), 'host':games[game].getHost()};
  return games_info;
}

function listOpenGames() {
  games_info = {};
  for(var game in open_games)
    games_info[game] = {'usernames':open_games[game].getUsernames(), 'host':open_games[game].getHost()};
  return games_info;
}

function listFinishedGames() {
  games_info = {};
  for(var game in finished_games)
    games_info[game] = {'usernames':finished_games[game].getUsernames(), 'host':finished_games[game].getHost()};
  return games_info;
}

function loadData() {
  connection.query('SELECT * FROM '+DATABASE+'.ACTIVE;', function(err, rows, fields) {
    if(err) throw err;
    games = {}
    for(var row of rows) {
      var gid = row.gid;
      var game = Game();
      game.load(row.game_info);
      games[gid] = game;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.OPEN;', function(err, rows, fields) {
    if(err) throw err;
    open_games = {}
    for(var row of rows) {
      var gid = row.gid;
      var game = Game();
      game.load(row.game_info);
      open_games[gid] = game;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.FINISHED;', function(err, rows, fields) {
    if(err) throw err;
    finished_games = {};
    for(var row of rows) {
      var gid = row.gid;
      var game = Game();
      game.load(row.game_info);

      finished_games[gid] = game;
    }
  });

  connection.query('SELECT * FROM '+DATABASE+'.USERS', function(err, rows, fields) {
    if(err) throw err;
    users = {};
    for(var row of rows) {
      users[row.username] = {'password':row.password};
    }
  });
}

// initializes game info, and public and private gamestates
// function initialize(num_players, num_colors, num_ranks, has_teams) {
function initialize(ginfo) {
  var game_info = {
    'num_players':ginfo.num_players,
    'num_colors':ginfo.num_colors,
    'num_ranks':ginfo.num_ranks,
    'has_teams':ginfo.has_teams,
    'statuses':Utils.fillArray('off', ginfo.num_players),
    'chat_log':[],
    'gid':newGameId(),
  };

  var game = Game();
  var errors = game.init(game_info, null);
  return game;
}

function saveGame(table, game, gid) {
  // table can be "active", "open", or "finished"
  game = game.repr(); 
  table = table.toUpperCase();
  connection.query("SELECT COUNT(*) FROM "+DATABASE+"."+table+" WHERE gid = '" + gid + "';", function(err, result) {
    if(err) throw err;
    if(result[0]['COUNT(*)'] == 0) {
      connection.query("INSERT INTO "+DATABASE+"."+table+"\n VALUES ('"+gid+"', '"+game+"');", function(err, result) {
        if(err) throw err;
      });
    }else{
      connection.query("UPDATE "+DATABASE+"."+table+"\n SET game_info='"+game+"'\n WHERE gid='"+gid+"';", function(err, result) {
        if(err) throw err;
      });
    }
  });
}

function deleteGame(table, gid) {
  table = table.toUpperCase();
  // table can be "active", "open", or "finished"
  connection.query("DELETE FROM "+DATABASE+"."+table+"\nWHERE gid='"+gid+"';", function(err, result) {
    if(err) throw err;
  });
}

function authenticate(username, password) {
  if (!(username in users))
    return false;
  return passwordHash.verify(password, users[username].password);
}

function createUser(username, password) {
  if (username in users)
    return "Username has been taken.";
  if (username.match("^[a-zA-Z0-9_]+$") == null)
    return "Username must be alphanumeric characters.";
  if(password.length < 6)
    return "Password must be at least 6 characters."

  var hashedPassword = passwordHash.generate(password);
  users[username] = {'password':hashedPassword};
  

  connection.query("INSERT INTO "+DATABASE+".USERS\n VALUES('"+username+"', '"+hashedPassword+"');", function(err, result) {
    if(err) throw err;
  });
  return "success";
}

function bcast(connections, event, args) {
  for (var user of connections) {
    if (!user.connected) {
      // connections.remove(user);
    } else {
      user.emit(event, args);
    }
  }
}

module.exports = function(server) {
  var io = require('socket.io')(server);

  io.on('connection', function(socket) {
    var username = null;
    var pid = null;
    var gid = null;
    var num_players = null;
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

      if (!authenticate(_username, _password)) {
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

    socket.on('user_register', function(user_info) {
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
      if(message == "success") {
        socket.emit('user_register success', {'username':_username, 'password':_password});
      } else{
        socket.emit('user_register denied', message);
      }
    });

    socket.on('create', function(ginfo) {
      if(view != 'lobby') {
        socket.emit('create error', 'invalid view');
        return;
      }

      function validate() {
        if(!(ginfo instanceof Object) || !('num_players' in ginfo) 
           || !('num_colors' in ginfo) || !('num_ranks' in ginfo)
           || isNaN(ginfo['num_players']) || isNaN(ginfo['num_colors']) 
           || isNaN(ginfo['num_ranks']) || ginfo['num_players'] <= 1 
           || ginfo['num_colors'] <= 0 || ginfo['num_ranks'] <= 0) {
          return 'invalid input';
        }
        if (ginfo.has_teams && ginfo.num_players != 4) {
          return 'team games must have 4 players (for now)';
        }
        return 'ok';
      }
      var errors = validate();
      if (errors != 'ok') {
        socket.emit('err', {action: 'create', reason: errors});
        return;
      }

      // var game = initialize(ginfo['num_players'], ginfo['num_colors'], ginfo['num_ranks'], true);
      var game = initialize(ginfo);
      // var game = Object.create(Game).init(ginfo, username);
      var id = game.getGameInfo().gid;
      open_games[id] = game;
      open_games[id].setHost(username);

      io.sockets.emit('updateGameList', {
        'games': listGames(),
        'openGames': listOpenGames()
      });
      socket.emit('create success', id);
      saveGame('open', game, id);
    });

    socket.on('join', function(_gid) {
      if(view != 'lobby') {
        socket.emit('join error', 'invalid view');
        return;
      }

      if(!(_gid in open_games)) {
        socket.emit('join error', 'invalid gid');
        return;
      }

      gid = _gid;

      open_games[gid].sockets.push(socket);

      view = 'wait';
      socket.emit('join success', {
        'game_info': open_games[gid].getGameInfo(),
        'host': open_games[gid].getHost(),
        'usernames': open_games[gid].getUsernames(),
        'gid': gid
      });
    });

    socket.on('register', function(_gid) {
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
      pid = game.getUsernames().indexOf(username);
      if (pid == -1) {
        socket.emit('register error', 'invalid user');
        return;
      }

      game.sockets.push(socket);
      socket.emit('register success', game.getUpdateObj(pid));
      view = 'game';
    });

    socket.on('update', function() {
      if (view == 'game' && pid != null && gid != null) {
        var game;
        if (gid in games) {
          game = games[gid];
        } else if (gid in finished_games) {
          game = finished_games[gid];
        }
        var updateObj = game.getUpdateObj(pid);
        socket.emit('update', updateObj);
      }
    });

    socket.on('logout', function() {
      if (view == 'login') {
        socket.emit('logout error', 'invalid view');
        return;
      }

      if(view == 'game') {
        games[gid].sockets.remove(socket);
      } else if(view == 'wait') {
        open_games[gid].sockets.remove(socket);
      }

      username = null;
      gid = null;
      pid = null;
      view = 'login';

      socket.emit('logout success');
    });
    
    socket.on('add_user', function(pid) {
      // TODO: check gid in open_games
      if (view != 'wait') {
        socket.emit('add_user error', 'invalid view');
        return;
      }

      if (pid >= open_games[gid].getGameInfo().num_players) {
        socket.emit('add_user error', 'invalid pid');
        return;
      }
      var usernames = open_games[gid].getUsernames();

      if (usernames.indexOf(username) != -1)
        if(usernames[pid] != null)
          usernames[usernames.indexOf(username)] = usernames[pid];
        else 
          usernames[usernames.indexOf(username)] = null;

      usernames[pid] = username;

      for (user of open_games[gid].sockets) {
        user.emit('wait update', {
          'gid':gid,
          'game_info': open_games[gid].getGameInfo(),
          'host': open_games[gid].getHost(),
          'usernames': open_games[gid].getUsernames(),
        });
      }

      saveGame('open', open_games[gid], gid);
    });

    socket.on('start', function() {
      if(view != 'wait') {
        socket.emit('start error', 'invalid view');
        return;
      }
      if(!(gid in open_games)) {
        socket.emit('start error', 'game not open');
        return;
      }
      var game = open_games[gid];
      if(username != game.getHost()) {
        socket.emit('start error', 'user not host');
        return;
      }
      for (name of game.getUsernames()) {
        if (name == null) {
          socket.emit('start error', 'unfilled positions');
          return;
        }
      }

      var connected_users = game.sockets;
      games[gid] = game;
      delete open_games[gid];

      for (var user of connected_users) {
        user.emit('start', {
          'gid': gid,
          'usernames': game.getUsernames(),
        });
      }
      deleteGame('open', gid);
      saveGame('active', game, gid);
    });

    socket.on('wait', function() {
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

    socket.on('wait_back', function() {
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

    socket.on('guess', function(guess) {
      if(view != 'game') {
        socket.emit('guess error', 'invalid view');
        return;
      }
      // guess is {target_id, target_card, rank}
      if(pid == null) {
        // checks that socket has registered as player
        socket.emit('guess error', 'pid undefined');
        return;
      }

      var result = games[gid].action(pid, 'guess', guess);
      if (result != 'ok') {
        socket.emit('guess error', result.error);
      } else {
        for (var skt of games[gid].sockets) {
          skt.emit('guess success');
        }
        saveGame('active', games[gid], gid);
      }
    });

    socket.on('pass', function(pass) {
      // pass is {card}
      if(view != 'game') {
        socket.emit('pass error', 'invalid view');
        return;
      }

      if(pid == null) {
        socket.emit('pass error', 'pid undefined');
        return;
      }

      var result = games[gid].action(pid, 'pass', pass);
      if (result != 'ok') {
        socket.emit('pass error', result.error);
      } else {
        for (var skt of games[gid].sockets) {
          skt.emit('pass success');
        }
        saveGame('active', games[gid], gid);
      }

    });

    socket.on('flip', function(flip) {
      // flip is {card}

      if(view != 'game') {
        socket.emit('flip error', 'invalid view');
        return;
      }

      if (pid == null) {
        socket.emit('flip error', 'pid undefined');
        return;
      }

      var result = games[gid].action(pid, 'flip', flip);
      if (result != 'ok') {
        socket.emit('flip error', result.error);
      } else {
        bcast(games[gid].sockets, 'flip success');
      }
    });
    
    socket.on('clam', function(clamObj) {
      // guess is in pid order [[1,2,3,4,5,6],[7,8,9,10,11,12],...]
      if (view != 'game') {
        socket.emit('clam error', 'invalid view');
        return;
      }

      var error = games[gid].action(pid, 'clam', clamObj);
      if (error != 'ok') {
        socket.emit('flip error', result.error);
      } else {
        for (var skt of games[gid].sockets) {
          skt.emit('clam success');
        }
        saveGame('active', games[gid], gid);
      }

      finished_games[gid] = games[gid];
      delete finished_games[gid]['sockets'];
      delete games[gid];
      saveGame('finished', finished_games[gid], gid);
      deleteGame('active', gid);
    });

    socket.on('game_back', function() {
      if(view != 'game') {
        socket.emit('game_back error', 'invalid view');
        return;
      }
      gid = null;
      pid = null;
      view = 'lobby';
      socket.emit('game_back success', {
        'games': listGames(),
        'openGames': listOpenGames()
      });
    })

    socket.on('disconnect', function() {
      if(view == 'game') {
        if (gid in games) {
          games[gid].sockets.remove(socket);
        }
      } else if(view == 'wait') {
        open_games[gid]['sockets'].remove(socket);
      }
    });
  });  
}
