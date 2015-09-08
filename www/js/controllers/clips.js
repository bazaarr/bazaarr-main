'use strict';
angular.module('bazaarr').controller('ClipsCtrl',
function($scope, $rootScope, $state, $timeout, $cacheFactory, $ionicPopup, $ionicScrollDelegate, $ionicPosition, $ionicNavBarDelegate, $ionicLoading, $ionicHistory,
MenuService, ClipsService, SearchService, ClipService, UserService, CollectionService, ToastService, HttpService, FollowService, AccountService, MetaService,
clips) {
    /*$scope.$watch("clips", function(newValue, oldValue){
        p(newValue);
        p(oldValue);
    });*/

    var menu = MenuService.getActiveMenu();

    if (angular.isDefined(clips.data) && clips.data != null && clips.data.length) {
        $scope.clips = ClipsService.prepare(clips.data, "", true);

        $scope.block_height = 0;
        $scope.vis_clips    = $scope.clips;

        if (clips.data.length >= 10) {
            $timeout(function(){
                $scope.is_load_more = true;
            }, 1000);
        }
        else {
            $rootScope.head.next_href = "";
        }
    }
    else {
        if (SearchService.isSearch()) {
            ToastService.showMessage("danger", "We did not find results. Please type a new query");
        }
        else {
            ToastService.showMessage("danger", "No clips");
        }
    }

    $scope.subtitle         = "";
    $scope.title            = Object.keys(menu).length ? menu.name : SearchService.getTitle();
    $scope.loading_more     = false;

    //$scope.cols     = ClipsService.getColsNumber();

    if ($state.includes("collection-view")) {
        setCollection();
    }
    if ($state.includes("hashtag")) {
        $scope.title    = '#' + $state.params.hashtagName;
        MetaService.set("clips", "hashtag", {"name" : $state.params.hashtagName});
        if (clips.data.length < 10) {
            $rootScope.head.next_href = "";
        }
    }
    if ($state.includes("category") && angular.isDefined(clips.data) && angular.isDefined(clips.data[0])) {
        $scope.title    = clips.data[0].category_name;
    }
    if ($state.includes("search-clips")) {
        $scope.search = {};
        $scope.search.search_api_views_fulltext = $state.params.query;
    }

    $scope.swipeLeft = function() {
        MenuService.nextMenu();
    };

    $scope.swipeRight = function() {
        MenuService.prevMenu();
    };

    $scope.openClip = function(clip) {
        //$timeout(function() {
        $state.go("clip", {clipId : clip.nid}).then(function() {
            //$ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);
        });
        //}, 200);
    };

    $scope.loadMore = function() {
        //$ionicLoading.show();
        if ($scope.loading_more === true) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            return false;
        }
        $scope.loading_more = true;
        var service  = {};
        if ($state.includes("search-clips")) {
            service = SearchService.loadMore();
        }
        else {
            service = ClipsService.loadMore();
        }

        service.then(function(data) {
            if (data.data == null) {
                $scope.is_load_more = false;
                $scope.$broadcast('scroll.infiniteScrollComplete');
                $scope.loading_more = false;
                return false;
            }

            clips.data = clips.data.concat(data.data);
            $scope.clips = ClipsService.prepare(data.data);

            $timeout(function(){
                $scope.$broadcast('scroll.infiniteScrollComplete');
                $scope.loading_more = false;
            }, 500);

            if (data.data.length < 10) {
                $scope.is_load_more = false;
            }
            //$ionicLoading.hide();
        }, function(reason) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.loading_more = false;
            //$ionicLoading.hide();
        });
    };

    // provide actions on clip
    $scope.onHold = function(clip) {
        ClipService.clip    = clip;
        $scope.clip         = ClipService.clip;
        $scope.clip_owner   = ClipService.clip.uid == UserService.user.uid;

        $scope.clip_actions_popup = $ionicPopup.show({
            title: 'Clip actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/clip_actions.html',
            buttons: [
                {
                    text: 'Cancel'
                }
            ],
            scope: $scope
        });
    };

    $scope.getBlockedClass = function(block) {
        return block === 0 ? 'blocked' : '';
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };

    $scope.is_scroll = false;

    $scope.onScroll = function() {
        //return true;

        if (clips.data.length < 30) {
            return false;
        }

        if ($scope.is_scroll) {
            return false;
        }

        $scope.is_scroll = true;

        var pos = $ionicScrollDelegate.$getByHandle('clipList').getScrollPosition();
        var pos_top = pos.top - 300;
        var pos_bot = pos.top + window.innerHeight + 300;

        var all_clips = $scope.clips;
        var vis_clips = [];
        var block_height    = 0;
p(all_clips);
        angular.forEach(all_clips, function(clips_row, i){
            var height          = 0;
            vis_clips[i]        = [];
            angular.forEach(clips_row, function(clip, j){
                //var clip_el = document.getElementById("clip-" + clip.nid);
                height += all_clips[i][j].wrap_h;  //clip_el.offsetHeight;
                if (height > pos_top && height < pos_bot) { // && all_clips[i][j].list_img === ""
//p("Return: " + all_clips[i][j].img);
                    vis_clips[i].push(all_clips[i][j]);
                    block_height = block_height || height;
                }
                else if ((height < pos_top || height > pos_bot)) { // && all_clips[i][j].list_img !== ""
//p("Remove: " + all_clips[i][j].img);
                    //all_clips[i][j].list_img = '';
                }
            });
        });

        $timeout(function() {
            //$scope.$apply(function(){
p(block_height);
                $scope.block_height = block_height;
                $scope.vis_clips    = vis_clips;
            //});

            $scope.is_scroll = false;
        }, 700);
    };

    $scope.doRefresh = function() {
        if ($state.includes("search-clips")) {
            $scope.$broadcast('scroll.refreshComplete');
            return false;
        }

        if ($state.current.name.indexOf("account.") > -1) {
            AccountService.update();
        }

        //TODO: remove after prepend new clips functionality
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.removeAll();
        //HttpService.addNoCache(ClipsService.page_api_url.replace(/\-\d+/gi, ""));
        ClipsService.pager[ClipsService.page_api_url] = 0;
        ClipsService.load(ClipsService.page_api_url, ClipsService.is_user_page, ClipsService.params).then(function(data) {
            $scope.clips = ClipsService.prepare(data.data, "", true);

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.$parent.doRefresh = $scope.doRefresh;

    $scope.canEdit = function() {
        if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
            return true;
        }

        return false;
    }

    $scope.searchInputKeyPress = function(e, search) {
        // console.log(e);
        $timeout(function() {
            if (e.keyCode == 13 || search.search_api_views_fulltext.length > 1) {
		SearchService.params = search;
                SearchService.load().then(function(data) {
			$scope.clips = ClipsService.prepare(data.data, "", true);
                });
            }
        });
    };

    $scope.$on('orientation:change', function() {
        if (ClipsService.getColsNumber() === ClipsService.size) {
            return false;
        }
        if ($scope.$$phase) {
            $scope.clips = ClipsService.prepare(clips.data); //applyOrientation
        }
        else {
            $scope.$apply(function () {
                $scope.clips = ClipsService.prepare(clips.data); //applyOrientation
            });
        }
        $ionicHistory.clearCache();
    });

    $scope.accept_collection = function(coll, type) {
        var bid = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            if(type == 0 || type == 3){
                $state.go('account.collections', {"userId" : $rootScope.user.uid});
            } else {
                $scope.collection.accepted = '1';
            }
            HttpService.clearCache();

            ToastService.showMessage("success", data.data.messages.status[0]);
        });
    };

    $scope.addClipFromCollection = function(collection) {
        CollectionService.add_clip_collection = collection;
        $state.go("add");
    }

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.backCondition = function() {
        if($state.includes('collection') || $state.includes('hashtag')) {
            $rootScope.back();
        }
    };

    function setCollection() {
        CollectionService.singleLoad($state.params.colId).then(function(data) {
            $scope.collection   = data.data[0];

            $scope.title = data.data[0].name;
            $timeout(function(){
                //$scope.title = data.data[0].name;
                $ionicNavBarDelegate.title(data.data[0].name);
            }, 800);

            MetaService.set("clips", "collection_clips",
                {"bid" : $scope.collection.bid, "name" : $scope.title, "description" : $scope.collection.description, "user_name" : $scope.collection.user_name});
        });
    }
});

angular.module('bazaarr').service('ClipsService',
function($rootScope, $state, $timeout, $location, $ionicLoading, HttpService, AccountService, ArrayService, MetaService, UserService) {
    this.pager = {};

    this.page_api_url   = "recent";
    this.is_user_page   = false;
    this.params         = {};

    this.clips = {};
    //this.clips.length = 0;

    this.newArr     = [];
    this.newArrSize = [];
    this.size       = 0;

    this.account_page = false;

    this.head_title         = "";
    this.head_description   = "";

    this.loadMore = function() {
        this.is_more = true;
        this.pager[this.page_api_url] = typeof this.pager[this.page_api_url] === "undefined" ? 1 : this.pager[this.page_api_url] + 1;
        return this.loadAdapter();
    };

    this.load = function(page, is_user_page, params) {
        this.params         = params || {};
        this.is_more        = false;
        this.account_page   = false;
        //TODO: why nested views not cache controller
        if (page === "clips" || page === "likes") {
            this.pager[page]    = 0;
            this.account_page   = true;
        }

        MetaService.set("clips", page, {"account_page" : this.account_page});

        return this.loadAdapter(page, is_user_page, params);
    };

    this.loadAdapter = function(page, is_user_page, params) {
        this.page_api_url   = page            || this.page_api_url;
        this.is_user_page   = is_user_page    || this.is_user_page;

        //Add id of collection to separate clips from different collections
        if (angular.isDefined(params) && angular.isDefined(params.bid)) {
            this.page_api_url = this.page_api_url + "-" + params.bid;
        }
        if (angular.isDefined(params) && angular.isDefined(params.tid_raw)) {
            this.page_api_url = this.page_api_url + "-" + params.tid_raw;
        }

        HttpService.view_url = this.page_api_url.replace(/\-\d+/gi, "");
        HttpService.page     = this.pager[this.page_api_url] || MetaService.seo_cur_page;
        HttpService.is_auth  = "following" === page ? true : false;//this.is_user_page ? true : false;
        HttpService.params   = params || this.params;
        
        if (this.is_user_page) {
            HttpService.params.uid = AccountService.getAccountId();
        }

        var promise = HttpService.get();
        var that    = this;
        promise.then(function() {
            if (that.account_page) {
                var account         = AccountService.getAccount();
                MetaService.set("clips", page, {"name" : account.name});
            }
        });
        return promise;
    }

    this.chunk_wall = function(arr, size) {
        if (!!arr === false) {
            return false;
        }

        if ((this.size && this.size !== size) || !this.is_more)  {
            this.newArr[this.page_api_url]      = [];
            this.newArrSize[this.page_api_url]  = [];
        }
        this.size = size;

        var newArr      = [];
        var newArrSize  = [];
        var j           = 0;
        var j_value     = 0;

        if (angular.isUndefined(this.newArr[this.page_api_url]) || !this.newArr[this.page_api_url].length) {
            this.newArr[this.page_api_url]      = [];
            this.newArrSize[this.page_api_url]  = [];
            for (var i = 0; i < size; i++) {
                this.newArr[this.page_api_url][i]       = [];
                this.newArrSize[this.page_api_url][i]   = 0;
            }
        }

        for (var i = 0; i < arr.length; i++) {
            j_value = this.newArrSize[this.page_api_url].reduce(function (p, v) {
                return ( p < v ? p : v);
            });
            j = this.newArrSize[this.page_api_url].indexOf(j_value);

            this.newArr[this.page_api_url][j].push(arr[i]);

            if (typeof arr[i].img_h !== "undefined") {
                this.newArrSize[this.page_api_url][j] += arr[i].img_h;
            }
            if (typeof arr[i].desc !== "undefined") {
                this.newArrSize[this.page_api_url][j] += Math.ceil(10 / size) * 15;
            }
        }

        return this.newArr[this.page_api_url];
    },

    this.chunk_collection = function(arr, size) {
        if (!!arr === false) {
            return false;
        }

        var newArr      = [];
        var newArrSize  = [];
        var j           = 0;
        var j_value     = 0;

        for (var i = 0; i < size; i++) {
            newArr[i]       = [];
            newArrSize[i]   = 0;
        }

        for (var i = 0; i < arr.length; i++) {
            j_value = newArrSize.reduce(function (p, v) {
                return ( p < v ? p : v);
            });
            j = newArrSize.indexOf(j_value);

            newArr[j].push(arr[i]);

            if (typeof arr[i].img_h !== "undefined") {
                newArrSize[j] += arr[i].img_h;
            }
            if (typeof arr[i].desc !== "undefined") {
                newArrSize[j] += Math.ceil(arr[i].desc.length / (7 * size)) * 15;
            }
        }

        return newArr;
    },

    this.chunk_table = function(arr, size) {
        if(arr) {
            var chunks = [],
                i = 0,
                n = arr.length;

            while (i < n) {
                chunks.push(arr.slice(i, i += size));
            }

            return chunks;
        }
    },

    this.applyOrientation = function(data, type) {
        type = type || "wall";

        var cols = this.getColsNumber();

        if ("table" == type) {
            return this.chunk_table(data, cols);
        }

        switch (type) {
            case "table":
                return this.chunk_table(data, cols);
                break;
            case "collection":
                return this.chunk_collection(data, cols);
                break;
            default:
                return this.chunk_wall(data, cols);
                break;
        }
    };

    this.getColsNumber = function() {
        var cols = 2;

        if (window.matchMedia("(orientation: landscape)").matches) {
           cols = 3;
        }

        if (ionic.Platform.isIPad()) {
            cols++;
        }

        return cols;
    };

    this.getCollection = function(bid) {
        HttpService.view_url = "collection_clips";
        HttpService.params   = {"bid" : bid};

        return HttpService.get();
    };

    CutString.prototype.cut = function(){
        var newDiv = document.createElement('div');
        this.searchEnd(this.tempDiv, newDiv);
        return newDiv.innerHTML;
    };

    CutString.prototype.searchEnd = function(parseDiv, newParent){
        var ele;
        var newEle;
        for(var j=0; j< parseDiv.childNodes.length; j++){
        ele = parseDiv.childNodes[j];
        // not text node
        if(ele.nodeType != 3){
            newEle = ele.cloneNode(true);
            newParent.appendChild(newEle);
            if(ele.childNodes.length === 0)
            continue;
            newEle.innerHTML = '';
            var res = this.searchEnd(ele,newEle);
            if(res)
            return res;
            else{
            continue;
            }
        }

        // the limit of the char count reached
        if(ele.nodeValue.length + this.charCount >= this.limit){
            newEle = ele.cloneNode(true);
            newEle.nodeValue = ele.nodeValue.substr(0, this.limit - this.charCount) + '...';
            newParent.appendChild(newEle);
            return true;
        }
        newEle = ele.cloneNode(true);
        newParent.appendChild(newEle);
        this.charCount += ele.nodeValue.length;
        }
        return false;
    };

    function cutHtmlString($string, $limit){
        var output = new CutString($string,$limit);
        return output.cut();
    }

    this.prepare = function(data, page, clear) {
        page = page || this.page_api_url;
        clear = clear || false;
//p(page);
        var width = Math.round(window.innerWidth / this.getColsNumber());

        if (angular.isUndefined(this.clips[page]) || clear) {
            this.clips[page] = [];
        }

        for (var i = 0; i < data.length; i++) {
            data[i] = this.preRenderSingle(data[i], width, page);
            var clips_length = this.clips[page].push(data[i]);
            data[i].index = clips_length - 1;
        }
/*var str = "";
angular.forEach(this.clips[page], function(value) {
    str += " - " + value.nid;
});
p(str);*/
        return this.applyOrientation(data);
    };

    this.hashtagUrlWrap = function (str) {
        if (angular.isUndefined(str)) {
            return "";
        }
        var count = (str.match(/href/g) || []).length;
        if (count) {
            return str;
        }
        return str.replace(/#(\w*)/g, '<a href="#!/hashtag/$1">#$1</a>');
    };

    this.fakeHashtagUrlWrap = function (str) {
        var count = (str.match(/href/g) || []).length;
        if (count) {
            return str;
        }
        return str.replace(/#(\w*)/g, '<span class="tag">#$1</span>');
    };

    this.preRenderSingle = function(data, width, page) {
        page = page || this.page_api_url;
        data.source_domain = ArrayService.url_domain(data.source_url);

        if(data.desc) {
            var hashtags = data.desc.match(/#\w*/g);
            data.random_hashtag = hashtags ? hashtags[Math.floor(Math.random()*hashtags.length)].substr(1) : "";
        }

        data.desc_text = data.desc;
        data.desc = this.hashtagUrlWrap(data.desc);
        //var obj = new CutString(data.desc, 70);
        if(data.desc_text && data.desc_text.length > 50) {
            var obj = new CutString(this.fakeHashtagUrlWrap(data.desc_text), 50);
        } else {
            var obj = new CutString(data.desc, 50);
        }
        data.full_short_desc = obj.cut();
        if(data.full_short_desc.length - data.full_short_desc.lastIndexOf('...') == 3) {
            data.full_short_desc = data.full_short_desc.substr(0, data.full_short_desc.lastIndexOf ('...')) + '<span class="expand">...</span>'
        }

        data.wrap_h          = Math.round(width * data.img_h * 0.9 / data.img_w);
        data.img_large_h     = Math.round(window.innerWidth * 0.9 * data.img_h / data.img_w);
        data.list_img        = data.img;
        data.comment_count   = parseInt(data.comment_count);
        data.price           = parseFloat(data.price);
        data.page_list       = page;
        data.index           = 0;
        var color = data.color;
        data.color = [];
        for(var s=0;s<color.length;s++){
            if(color[s].name != 'noname'){
                data.color.push(color[s]);
            }
        }
        data.is_ebay         = data.source_url.indexOf("ebay.com") === -1 ? false : true;

        var c = document.getElementsByClassName('view-container')[0];
        if(c.clientWidth / c.clientHeight > 0.67) {
            data.tablet = 1;
        } else {
            data.tablet = 0;
        }

        window.wideClip = data.wideClip = data.img_w > data.img_h;

        return data;
    };

    this.getScreenWidth = function() {
        if (window.matchMedia("(orientation: landscape)").matches) {
           return screen.height;
        }

        return screen.width;
    };

    this.updateClipInList = function(clip) {
        this.clips[clip.page_list][clip.index] = clip;
    };
});

angular.module('bazaarr').filter('inSlicesOf', ['ClipsService', function(ClipsService) {
    this.makeSlices = function(items, count) {
        count = count || 2;

        if (!angular.isArray(items))
            return items;

        var array       = [];
        var chunkIndex  = -1;
        for (var i = 0; i < items.length; i++) {
            //var chunkIndex = parseInt(i / count, 10);
            chunkIndex = chunkIndex === count - 1 ? 0 : chunkIndex + 1;

            if (angular.isUndefined(array[chunkIndex])) {
                array[chunkIndex] = [];
            }

            array[chunkIndex].push(items[i]);
        }

        if (!angular.equals(ClipsService.arrayinSliceOf, array)) {
            ClipsService.arrayinSliceOf = array;
        }

        return ClipsService.arrayinSliceOf;
    };

    return this.makeSlices;
}])