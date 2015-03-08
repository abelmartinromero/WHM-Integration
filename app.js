(function() {



  var SECRET_ACCESS_TOKEN = "BetterChangeMeNowOrSufferTheConsequences";
  var WHM_API_HASH = "HIDDENMUAHAHAHA";
  var services = ["ftpd","httpd","mysql","pop","exim","imap"];
  var ticket;
  var subject;
  var ms= /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  var ip;

  return {
    requests:{
      servContact: function(ip,action){
        return {
          url: 'https://s2.netizate.com/iphandle.php',
          type: 'POST',
          data: {"action":action,
                 "ip":ip,
                 "sat": SECRET_ACCESS_TOKEN
                },
        };
      },
      getUserData: function(cpanel){
        return{
          url: 'https://s2.netizate.com:2087/json-api/accountsummary?api.version=1&user='+cpanel,
          
          beforeSend: function(data) {
            //Authorization: WHM $whmusername:" . preg_replace("'(\r|\n)'","",$hash
            data.setRequestHeader("Authorization", "WHM root:" + WHM_API_HASH);
          },
          type: 'GET'

        };
      },
      checkServiceStatus: function(){
        return{
          url: 'https://s2.netizate.com:2087/json-api/servicestatus?api.version=1',
          beforeSend: function(data) {
            //Authorization: WHM $whmusername:" . preg_replace("'(\r|\n)'","",$hash
            data.setRequestHeader("Authorization", "WHM root:" + WHM_API_HASH);
          },
          type: 'GET'
        };
      },
      suspendAccount: function(user,reason){
        return{
        url: 'https://s2.netizate.com:2087/json-api/suspendacct?api.version=1&user='+user+'&reason='+reason,
          beforeSend: function(data) {
            //Authorization: WHM $whmusername:" . preg_replace("'(\r|\n)'","",$hash
            data.setRequestHeader("Authorization", "WHM root:" + WHM_API_HASH);
          },
          type: 'GET'
        };
      }
    },
    events: {
      'app.activated':'doSomething',
      'click #blacklist':'addBlackListIP',
      'click #whitelist':'addWhiteListIP',
      'click #restart_fw':'restartFirewall',
      'click #search_cpanel':'doManualSearchAccount',
      'click #suspend':'doSuspendVerify',
      'click .btn_refresh':'doCheckServiceStatus'
    },

    doSomething: function() {
      ticket = this.ticket();
      subject = ticket.subject();
      ip= subject.match(ms);
      this.switchTo('main'); 
      var cPanel = ticket.customField('custom_field_24103102');
      this.doSearchAccount(cPanel);
      
      this.doCheckServiceStatus();
      
    },
    doCheckServiceStatus:function(){
     var request = this.ajax('checkServiceStatus').done(function(result){
      data = JSON.parse(result);
      v_icon_check = '<i class="icon-white icon-ok"></i>';
      v_icon_fail = '<i class="icon-repeat"></i>';
      
      console.log(result);
      _.each(services,function(service){
        var v_service = _.find(data.data.service, function(aux_s){return aux_s.name == service});
        if(v_service.monitored != 1){
        this.$('#logs').append("<p>Service " + service + " is not monitored. Please make sure it's being monitored if you want to check it's status</p>");
        }else{
          if(v_service.running == 1){
            this.$('#'+service+'_s1').attr("class","label label-success");
          }else{
            this.$('#'+service+'_s1').attr("class","label label-important");
            this.$('#'+service+'_s1').append(v_icon_fail);
          }
      }
      });
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
      if(cPanel != "" && cPanel){
        this.doSearchAccount(cPanel);
      }
    },
    doSearchAccount: function(cPanel){
      this.$('#suspend').hide();
      this.$('#unsuspend').hide();
      this.$('#user_data').empty();
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
        if(v_data.data.acct[0].suspended != 0){
          //this.$('#account_details').append('<button id="unsuspend" class="btn btn-success">Unsuspend</button>');
          this.$('#suspend').hide();
          this.$('#unsuspend').show();
        }
        }
      });
    },
    addBlackListIP: function(){
       
       console.log(subject);
       var ip = subject.match(ms);
       this.ticket().customField("custom_field_25681372", ip[0]);
       this.doCleanLogs();
       this.doAddLogs("Blacklisting IP "+ ip[0]);
       var request = this.ajax('servContact',ip[0],'blacklist').done(function(data) {
          console.log(data);
            this.doAddLogs(data);
         });
    },
    addWhiteListIP: function(){
       var ip = subject.match(ms);
       this.doCleanLogs();
       this.doAddLogs("Whitelisting IP "+ ip[0]);
       this.ticket().customField("custom_field_25664101", ip[0]);
       var request = this.ajax('servContact',ip[0],'whitelist').done(function(data) {
            this.doAddLogs(data);
            this.doAddLogs("IP "+ip[0]+" Successfully whitelisted.");
         });
    },
    restartFirewall: function(){

      this.doAddLogs("Restarting the Firewall");
      var request = this.ajax('servContact',0,'restart').done(function(data) {
            this.doAddLogs("CSF + LFD Restarted");
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
