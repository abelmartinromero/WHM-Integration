(function() {

  var services = ["ftpd","httpd","mysql","pop","exim","imap"];
  var ticket;

  return {
    requests:{
      getUserData: function(cpanel){
        return{
          url: "https://{{setting.server_domain}}:2087/json-api/accountsummary?api.version=1&user="+cpanel,
          headers: {
            'Authorization': "WHM {{setting.server_username}}:{{setting.server_hash}}"
          },
          type: 'GET',
          secure:true

        };
      },
      checkServiceStatus: function(){
        return{
          url: 'https://{{setting.server_domain}}:2087/json-api/servicestatus?api.version=1',
          headers: {
            'Authorization': 'WHM {{setting.server_username}}:{{setting.server_hash}}'
          },
          type: 'GET',
          secure:true
        };
      },
      restartService: function(service){
        return{
          url: 'https://{{setting.server_domain}}:2087/json-api/restartservice?api.version=1&service='+service,
          headers: {
            'Authorization': 'WHM {{setting.server_username}}:{{setting.server_hash}}'
          },
          type: 'GET',
          secure:true
        };
      },
      suspendAccount: function(user,reason){
        return{
        url: 'https://{{setting.server_domain}}::2087/json-api/suspendacct?api.version=1&user='+user+'&reason='+reason,
          headers: {
            'Authorization': 'WHM {{setting.server_username}}:{{setting.server_hash}}'
          },
          type: 'GET',
          secure:true
        };
      },
    },
    events: {
      'app.activated':'doSomething',
      'click #search_cpanel':'doManualSearchAccount',
      'click #suspend':'doSuspendVerify',
      'click .btn_refresh':'doCheckServiceStatus',
      'click .restart_service':'doRestartService',
      'click #toggle_status': 'doToggleDropDown'
    },
    doToggleDropDown: function(e){
      e.preventDefault();
      switch(this.$('#caret_server')[0].className)
      {
        case "caret caret-reversed":
          this.$('#caret_server').attr('class','caret');
          this.$('#status_list').hide();
        break;
        case "caret":
          this.$('#caret_server').attr('class','caret caret-reversed');
          this.$('#status_list').show();
          this.doCheckServiceStatus();
        break;
      }
    },
    doSomething: function() {
      ticket = this.ticket();
      this.switchTo('main'); 

      // Get all the cpanel
        var cPanelField = this.requirement('cpanel_field');
        var cPanel = this.ticketFields('custom_field_' + cPanelField.requirement_id);
        
        if(cPanel){
          this.doManualSearchAccount(cPanel);
        }else{
          this.doAddLogs("No cPanel account found on the ticket.");
        }      
      
    },
    doRestartService:function(e){
      this.doCleanLogs();
      var service = e.target.parentNode.id;
      this.doAddLogs("Restarting service " + service);
      this.ajax('restartService',service).done(function(result){
        var data = JSON.parse(result);
        this.doAddLogs(data.metadata.output.raw);
      });
      this.doCheckServiceStatus();
    },
    doCheckServiceStatus:function(){
      this.$('#status_list').empty();
      this.$('#status_list').append('<div class="spinner dotted"></div>');

      var request = this.ajax('checkServiceStatus').done(function(result){
      this.$('#status_list').empty();  
      var data = JSON.parse(result);
      
      var service_list = "";
      _.each(services,function(service){
        var v_service = _.find(data.data.service, function(aux_s){return aux_s.name == service;});
        if(v_service.monitored != 1){
        this.$('#logs').append("<p>Service " + service + " is not monitored. Please make sure it's being monitored if you want to check it's status</p>");
        }else{
          if(v_service.running == 1){
            service_list+=('<tr class="success"><td class="service">'+service+'</td><td>Online</td><td><span class="label label-danger">Stop</span> <span class="label label-warning restart_service">Restart</span></td></tr>');
            //Success
          }else{
            //Fail3
            service_list+=('<tr class="danger"><td class="service">'+service+'</td><td>Offline</td><td><span class="label label-success">Start</span></td></tr>');
          }
      }
      
      });
      this.$('#status_list').append(service_list);
     }); 
    },
    doSuspendVerify: function(){
      var v_u = this.$('#username').text().split(' ');
      var username = v_u[1];
      var modal = this.$("#suspension_reason_modal");
      modal.html(this.renderTemplate('modal', username));
      modal.modal();
    },
    doManualSearchAccount: function(){
      var cPanel = this.$('#cpanel').val();
      if(cPanel !== "" && cPanel){
        this.doSearchAccount(cPanel);
      }
    },
    doSearchAccount: function(cPanel){
      this.$('#suspend').hide();
      this.$('#unsuspend').hide();
      this.$('#user_data').empty();
      this.$('#user_data').show();
      this.$('#user_data').append('<div class="spinner dotted"></div>');
      var tst = this.ajax('getUserData',cPanel);

      this.when(tst).done(function(data){
        console.log(data);
        this.$('#user_data').empty();
        var v_data = JSON.parse(data);
        if(v_data.metadata.result<1){
          this.$('#account_details').attr('class',"alert alert-danger");
          this.$('#user_data').append("No accounts found");
        }else{
        this.ticket().customField('custom_field_24103102',v_data.data.acct[0].user);
        
        var html = "<li id='username'><strong>Username:</strong> "+v_data.data.acct[0].user+"</li><li><strong>Domain: </strong> "+v_data.data.acct[0].domain+"</li><li><strong>IP: </strong> "+v_data.data.acct[0].ip+"</li><li><strong>Contact Email:</strong> "+v_data.data.acct[0].email+"</li><li><strong>Quota: </strong> "+v_data.data.acct[0].disklimit+"</li><li><strong>Disk Used:</strong> "+v_data.data.acct[0].diskused+"</li><li><strong>Package:</strong> "+v_data.data.acct[0].package+"</li><li><strong>Reseller/Owner:</strong> "+v_data.data.acct[0].owner+"</li><li><strong>Suspended?: </strong> "+(v_data.data.acct[0].suspended ? "Yes" : "No")+"</li><li><strong>Reason: </strong>"+(v_data.data.acct[0].suspendedreason? v_data.data.acct[0].suspendedreason :"N/A")+"</li>";
        this.$('#user_data').append(html);
        this.$('#account_details').attr('class',"alert alert-info");


        //this.$('#account_details').append('<button id="suspend" class="btn btn-alert">Suspend</button>');
        this.$('#unsuspend').hide();
        this.$('#suspend').show();
        if(v_data.data.acct[0].suspended !== 0){
          //this.$('#account_details').append('<button id="unsuspend" class="btn btn-success">Unsuspend</button>');
          this.$('#suspend').hide();
          this.$('#unsuspend').show();
        }
        }
      });
    },
    doAddLogs: function(text){
      this.$('#logs').append("<p>"+text+"</p>");
    },
    doCleanLogs: function(){
      this.$('#logs').empty();
    }


  };

}());
