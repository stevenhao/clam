module.exports = function(server){
  var io = require('socket.io')(server);
  var num_players = 4;
  initialize(num_players, true);

  io.on('connection', function(socket){
    console.log('user connected');

    socket.on('guess', function(guess){
      // guess is {pid, target_id, target_card, rank}
      if(public_gs['phase'] != 'guess' || public_gs['turn'] != guess['pid']){
        socket.emit('guess response', ['Error', 'out of turn']);
        return;
      }
      if(public_gs['turn'] == guess['target_id']){
        socket.emit('guess response', ['Error', 'invalid person']);
        return;
      }
      if(game_info['has_teams'] && (guess['target_id'] - guess['pid'])%num_players == num_players/2){
        socket.emit('guess response', ['Error', 'invalid person']);
        return;
      }
      var target_id = guess['target_id'];
      var card = guess['target_card'];
      var cards = public_gs['cards'];
      if(cards[target_id][card][2]){
        socket.emit('guess response', ['Error', 'card already revealed']);
        return;
      }

    });

    socket.on('pass', function(data){

    });

    socket.on('flip', function(data){

    });

    socket.on('chat message', function(data){
      console.log(data);
    })

    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
  });
}

// creates a copy of an array
function copy(o) {
  var copy = Object.create(Object.getPrototypeOf(o));
  var propNames = Object.getOwnPropertyNames(o);

  propNames.forEach(function(name) {
    var desc = Object.getOwnPropertyDescriptor(o, name);
    Object.defineProperty(copy, name, desc);
  });

  return copy;
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
      deck.push([j, i, false]);

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
function initialize(num_players, has_teams){
  game_info = {
    'num_players':num_players,
    'has_teams':has_teams,
    'statuses':fillArray('off', num_players),
    'chat_log':[]
  };
  
  public_gs = {
    'turn': 0,
    'phase': 'pass',
    'cards': generateCards(2, 12, num_players),
    'pass_history': [],
    'guess_history': []
  };

  private_gs = {
    'cards': []
  }

  for(i = 0; i < num_players; ++i) {
    var cards = public_gs['cards'];
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
