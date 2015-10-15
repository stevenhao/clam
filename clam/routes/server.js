module.exports = function(server){
  var io = require('socket.io')(server);
  var num_players = 4;
  var num_colors = 2;
  var num_ranks = 12;
  initialize(num_players, num_colors, num_ranks, true);
  var sockets = fillArray(null, num_players);

  io.on('connection', function(socket){
    console.log('user connected');
    var pid = null;

    socket.on('pid', function(id){
      // register socket with player id
      if(id >= num_players) // checks that id is valid
        socket.emit('register error', 'invalid id');
      else{
        sockets[id] = socket;
        pid = id;
        update_player('register success', pid);
      }
    });

    socket.on('guess', function(guess){
      // guess is {target_id, target_card, rank}
      if(pid == null){
        // checks that socket has registered as player
        socket.emit('guess error', 'pid undefined');
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
      if(cards[target_id][card][2]){
        // checks that target card has not been revealed
        socket.emit('guess error', 'card already revealed');
        return;
      }
      
      if(true_cards[target_id][card][0] == rank){
        // guess is correct
        // updates public gamestate
        cards[target_id][card][0] = rank;
        cards[target_id][card][2] = true;
        for(i = 0; i < num_players; ++i) {
          // updates private gamestates
          private_cards[i][target_id][card][0] = rank;
          private_cards[i][target_id][card][2] = true;
        }

        // updates guess history
        public_gs['guess_history'].push([pid, target_id, card, rank, true, card, rank]);
        public_gs['turn'] = (public_gs['turn']+1)%num_players;
        public_gs['phase'] = 'pass';
      } else {
        // guess is incorrect

        // updates guess history
        public_gs['guess_history'].push([pid, target_id, card, rank, false, null, null]);
        public_gs['phase'] = 'flip';
      }
      update_all('guess success');
    });

    socket.on('pass', function(pass){
      // pass is {card}
      if(pid == null){
        socket.emit('pass error', 'pid undefined');
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
      
      var rank = true_cards[pid][card][0];
      // updates private gamestate
      private_gs['cards'][public_gs['turn']][pid][card][0] = rank;

      // updates pass history
      public_gs['pass_history'].push([public_gs['turn'], card]);
      public_gs['phase'] = 'guess';

      update_all('pass success');
    });

    socket.on('flip', function(flip){
      // flip is {card}
      if (pid == null){
        socket.emit('flip error', 'pid undefined');
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

      var cards = public_gs['cards']
      if(cards[pid][card][2]){
        // checks that card is not already flipped
        socket.emit('flip error', 'card already revealed');
        return;
      }

      var rank = true_cards[pid][card][0];

      // updates public gamestate
      cards[pid][card][0] = rank;
      cards[pid][card][2] = true;
      for(i = 0; i < num_players; ++i) {
        // updates private gamestates
        private_cards[i][pid][card][0] = rank;
        private_cards[i][pid][card][2] = true;
      }

      // updates guess history
      public_gs['guess_history'][public_gs['guess_history'].length - 1][5] = card;
      public_gs['guess_history'][public_gs['guess_history'].length - 1][6] = rank;
      public_gs['turn'] = (public_gs['turn']+1)%num_players;
      public_gs['phase'] = 'pass';

      update_all('flip success');
    });

    socket.on('chat message', function(data){
      console.log(data);
      socket.emit('cat response', ['yo', 'wass', 'up']);
    })

    socket.on('disconnect', function(){
      sockets[pid] = null;
    });
  });
  
  function update_player(response_type, id){
    sockets[id].emit(response_type, {'game_info':game_info, 
                                        'public':public_gs, 
                                       'private':private_gs['cards'][id]});
  }

  function update_all(response_type){
    for(i = 0; i < num_players; ++i)
      sockets[i].emit(response_type, {'game_info':game_info,
                                         'public':public_gs, 
                                        'private':private_gs['cards'][i]});
  }
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
      deck.push([j, i]);

  shuffle(deck);

  var cards = [];
  var hand_size = max_rank*num_colors/num_players;
  for (i = 0; i < num_players; ++i){
    var hand = deck.slice(hand_size*i, hand_size*(i+1));
    hand.sort(function(a, b){return a[0] - b[0]});
    cards.push(hand);
  }

  return cards;
}

// initializes game info, and public and private gamestates
function initialize(num_players, num_colors, num_ranks, has_teams){
  game_info = {
    'num_players':num_players,
    'has_teams':has_teams,
    'statuses':fillArray('off', num_players),
    'chat_log':[]
  };
  
  true_cards = generateCards(num_colors, num_ranks, num_players);

  public_gs = {
    'turn': 0,
    'phase': 'pass',
    'cards': [],
    'pass_history': [],
    'guess_history': []
  };

  private_gs = {
    'cards': []
  }

  for(i = 0; i < true_cards.length; ++i) {
    var hand = [];
    for(j = 0; j < true_cards[0].length; ++j) {
      hand.push([0, true_cards[i][j][1], false]);
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
          hand.push([cards[j][k][0], cards[j][k][1], true]);
      else 
        for (k = 0; k < cards[j].length; ++k) 
          hand.push([0, cards[j][k][1], false]);
      player_cards.push(hand);
    }
    private_gs['cards'].push(player_cards);
  }
}
