var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  //hasTimestamps: true,

  initialize: function(){
    this.on('creating', function(model, attrs, options){
      var password = model.get('password');
      console.log(password);
      var salt = bcrypt.genSaltSync(10);
      console.log('SALT is: ', salt);
      model.set('salt' , salt);
      var hash = bcrypt.hashSync(password , salt);
      console.log(hash);
      model.set('password', hash);

    });
  },
  validatePassword: function(password){
    var salt = this.get('salt');
    var hash = bcrypt.hashSync(password, salt);

    console.log("VALIDATING PASSWORD:", password);
    console.log("PASSWORD WAS HASHED TO:", hash);
    console.log("THIS MODEL'S PASSWORD IS ", this.get('password'));

    if( hash === this.get('password')) {
      return true;
    } else {
      return false;
    }
  }

});

module.exports = User;
