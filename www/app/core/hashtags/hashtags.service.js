angular.module('bazaarr').service('HashtagsService', function($rootScope, $timeout, $q, HttpService, AccountService){
    this.hashtags       = {};
    this.hashtags_names = {};

    this.loadByName = function(name) {
        var hashtag = this.getHashtagByName(name);
        
        if (hashtag) {
            return $q.when({"data": [hashtag]});
        }
        
        HttpService.view_url 	= "single-tag";
        HttpService.params 	= {name : "#" + name};

        var promise = HttpService.get(),
            that    = this;
        promise.then(function(data) {
            that.setHashtags(data.data);
        });

        return promise;
    };
    
    this.loadListByUser = function(clear) {
        clear = clear || false;
        if (clear) {
            HttpService.clearHttpCache("hashtags-list");
        }
        HttpService.view_url 	= "hashtags-list";
        HttpService.params 	= {uid : AccountService.getAccountId()};
        HttpService.is_auth     = false;
        
        var promise = HttpService.get(),
            that    = this;
        promise.then(function(data) {
            that.setHashtags(data.data);
            $timeout(function() {                
                $rootScope.$broadcast("slider:update");
            });
        });
    
        return promise;
    };
    
    this.follow = function (id, follow) {
        follow = 1 - parseInt(follow);
        
        HttpService.view_url    = "follow/" + id;
        HttpService.params      = {"type" : "hashtag", "action" : follow};
        
        var promise = HttpService.put(),
            that    = this;
        promise.then(function() {
            that.hashtags[id].is_follow = follow;
            HttpService.clearHttpCache("hashtags-list");
        });
        
        return promise;
    };
    
    this.getHashtagByName = function(name) {
        if (angular.isDefined(this.hashtags_names[name]) && angular.isDefined(this.hashtags[this.hashtags_names[name]])) {
            return this.hashtags[this.hashtags_names[name]]
        }
        
        return false;
    };

    this.setHashtags = function (data) {
        var that = this;
        data.map(function(hashtag) {
            hashtag.is_follow   = angular.isDefined(hashtag.is_follow) ? 1 : 0;
            hashtag.name        = hashtag.name.substr(0, 1) === "#" ? hashtag.name.substr(1) : hashtag.name;
            
            that.hashtags[hashtag.tid]         = hashtag;
            that.hashtags_names[hashtag.name]  = hashtag.tid;
        });
    };
});