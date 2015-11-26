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

  // returns random alphanumeric string of len length
  randomString: function(length) {
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
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

