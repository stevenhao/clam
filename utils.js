var fs = require('fs');

function initWords(){
  var FILE = 'words.csv';
  fs.readFile(FILE, 'utf8', function(err, data){
    if(err) throw err;
    words = data.split('\n');
  });
}

initWords();

var util = {
  // creates array of length 'len' with values 'value'
  fillArray: function(value, len) {
    var arr = [];
    for (i = 0; i < len; i++) {
      arr.push(value);
    }
    return arr;
  },

  // shuffles array
  shuffle: function(array) {
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
  },

  // returns a string of N random words
  randomWords: function(N) {
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    var word = "";
    for(i = 0; i < N; ++i) {
      word += words[getRandomInt(0, words.length - 1)] + " ";
    }
    return word.substring(0, word.length - 1);
  },


  // creates a clone of an array
  cloneObj: function(obj) {
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
  },
};

module.exports = util;

