// Settings
var GROWL_INTERVAL = 1000;
var GROWL_ENABLED = true;
var POMO_MINUTES = 25;

var place = require('./place_table');
var client_info = {};
var client_max_id = 1;
var title = "DevHub ";
var growl_passwd = "growl";
var growl_buffer = [];
var isSending = false;
var guest_no = 1;

module.exports.send_growl = function(addr, data){
  if (!GROWL_ENABLED){ return; }

  var ip = addr.split(":")[0];
  var msg = "[" + data.name + "] " + data.msg;
  var cmd = 'growl -H ' + ip + ' -t "' + title + '" -m "' + msg + '" -P ' + growl_passwd;

  growl_buffer.push(cmd);

  if (!isSending){
    this._growl_sender();
  }
};

module.exports._growl_sender = function(){
  var cmd = growl_buffer.shift();
  var that = this;
  if (cmd){
    isSending = true;
    setTimeout(function(){
      var exec = require('child_process').exec
      exec(cmd, {timeout: 1000},
        function(error, stdout, stderr){
          if (error){
            console.log(cmd);
            console.log(error);
          }
        }
      );
      that._growl_sender();
    }, GROWL_INTERVAL);
  }else{
    isSending = false;
  }
}

module.exports.options = function(options){
  title += options.title;
  GROWL_ENABLED = options.growl;
}

module.exports.send_growl_all = function(data){
  for (var ip in client_info){
    if ( client_info[ip].pomo != true){
      this.send_growl(ip,data);
    }
  }
};

module.exports.send_growl_without = function(client, data){
  var current_ip = this.get_ip(client)
  for (var ip in client_info){
    if ( ip != current_ip ){
      if ( client_info[ip].pomo != true){
        this.send_growl(ip,data);
      }
    }
  }
};

module.exports.send_growl_to = function(client, data){
  var ip = this.get_ip(client)
  if ( client_info[ip].pomo != true){
    this.send_growl(ip,data);
  }
};

module.exports.login = function(login_ip){
  for (var ip in client_info){
    if(ip == login_ip){
      return true;
    }
  }

  var dummy_name = "Guest" + guest_no++;
  
  client_info[login_ip] = 
  {
    name: dummy_name,
    pomo_min: 0,
    id: client_max_id
  }
  client_max_id += 1

  return true; 
};

module.exports.set_name = function(client, data){
  if (data.name == null || data.name == ""){return false;}

  // 名前かアバターに変更があれば true
  var current_ip = this.get_ip(client)
  if (client_info[current_ip]){
    if (client_info[current_ip].name != data.name ||
        client_info[current_ip].avatar != data.avatar){
      client_info[current_ip].name = data.name;
      client_info[current_ip].avatar = data.avatar;
      return true;
    }else{
      return false;
    }
  }
  return false;
};
 
module.exports.logout = function(client){
  var logout_ip = this.get_ip(client)

  // ログイン中のログアウトチェック 
  if ( this.exist_ip_num(client, logout_ip) > 1 ){
    return false;
  }
  delete client_info[logout_ip]

  return true;
};
 
module.exports.list = function(){
  var list = [];
  for (var ip in client_info){
    list.push(
      {
        name: client_info[ip].name,
        avatar: client_info[ip].avatar,
        pomo_min: client_info[ip].pomo_min,
        id: client_info[ip].id,
        place: place.get_place_by_ip(ip)
      });
  }
  return list;
}

module.exports.get_valid_name = function(name,ip){
    if ( name != undefined ){ 
      return name
    }else{
      return ip
    }
}
 
module.exports.exist_ip_num = function(client, ip){
  var ip_count = 0;
  for (var key in client.manager.handshaken){
    if ( client.manager.handshaken[key].address.address + ":" + client.manager.handshaken[key].address.port == ip ){
     ip_count += 1;
    }
  }
  return ip_count;
}

module.exports.get_info = function(client){
  var client_ip = this.get_ip(client);
  return client_info[client_ip];
}

module.exports.get_ip = function(client){
  return client.handshake.address.address + ":" + client.handshake.address.port;
}

module.exports.get_name = function(client){
  var c = this.get_info(client);
  return c.name;
}

module.exports.get_id = function(client){
  var c = this.get_info(client);
  return c.id
}

module.exports.is_pomo = function(client){
  var c = this.get_info(client);
  if ( c.pomo == true ){
    return true;
  }else{
    return false;
  }
}

module.exports.set_pomo = function(client, pomo_flg, timer_id){
  var c = this.get_info(client);
  c.pomo = pomo_flg;
  if (pomo_flg){
    c.pomo_id = timer_id;
    c.pomo_min = POMO_MINUTES;
  }else{
    clearTimeout(c.pomo_id);
    c.pomo_id = null;
    c.pomo_min = 0
  }
}

module.exports.update_pomo = function(client, min){
  var c = this.get_info(client);
  return c.pomo_min -= min
}


