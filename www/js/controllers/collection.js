'use strict';
angular.module('bazaarr').controller('AccountCollectionListCtrl',
function($scope, $rootScope, $state, $ionicHistory, CollectionService, FollowService, AccountService, ClipsService, HttpService, collections, ToastService) {
    $scope.col_width = Math.round(100 / ClipsService.getColsNumber());
    $scope.grouped_list = {};

    FollowService.colls = $scope.grouped_list;

    for(var type in collections.data){
        $scope.grouped_list[type] = setCollections(collections.data[type], type);
    }

    $scope.goAddCollection = function() {
        $scope.collection = {bid:"new"};
        $state.go("add-collection").then(function(){
            $rootScope.$broadcast("form:clear");
        });
    };

    function setCollections(collections, type) {
        if ($state.includes('account.collections') && AccountService.is_my_account && collections && collections[0].bid != 0 && type == 'public') {
            collections.unshift({"bid" : 0});
        }
        return CollectionService.prepare(collections);
    }

    $scope.isFirst = function(bid) {
        return !!bid === false ? true : false;
    };

    $scope.openCollection = function(id) {
        $state.go("collection", {colId : id}).then(function(){
            $rootScope.$broadcast('update:collection_titles', {bid : id});
        });
    };

    $scope.accept_collection = function(coll, type) {
        var index           = this.$parent.$parent.$parent.$index,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            bid             = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            HttpService.addNoCache("get_user_collections/" + $rootScope.user.uid);
            if(type == 0 || type == 3){

                $scope.grouped_list[coll.type][parent_index].splice(index, 1);
                if(!$scope.grouped_list[coll.type][parent_index].length){
                    $scope.grouped_list[coll.type].splice(parent_index, 1);
                }
                if(angular.isDefined($scope.grouped_list['shared']) && (!$scope.grouped_list['shared'] || $scope.grouped_list['shared'].length == 0)){
                    delete $scope.grouped_list['shared'];
                }
                HttpService.clearCache();
            } else {
                $scope.grouped_list[coll.type][parent_index][index].accepted = 1;
            }

            ToastService.showMessage("success", data.data.message);
        });
    };

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.followCollection = function(coll, type) {
        var send_type       = (1 === type) ? 0 : 1,
            bid = coll.bid,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            index           = this.$parent.$parent.$parent.$index,
            is_follow       = $scope.account.is_follow;

        FollowService.followCollection(bid, send_type).then(function(data){
            if(send_type){
                $scope.account.is_follow = 1;
            }
            if(!data.data.user_follow){
                $scope.account.is_follow = 0;
            }
            if(data.data.message){
                ToastService.showMessage("success", data.data.message);
            }
            $scope.grouped_list[coll.type][parent_index][index].follow = send_type;
            FollowService.followUserCallback(send_type);
            if (is_follow !== $scope.account.is_follow) {
                AccountService.updateCounters('followers_count', send_type, true);
            }
        });
    };

    $scope.$parent.doRefresh = function() {
        //$rootScope.$broadcast('scroll.refreshComplete');
        //return true;

        var promise = {};
        HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
        promise = CollectionService.load2();

        AccountService.update();

        promise.then(function(data) {
            for(var type in data.data){
                $scope.grouped_list[type] = setCollections(data.data[type], type);
            }

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.$on('collections:follow', function(event, args) {
        for(var type in collections.data){
            collections.data[type] = CollectionService.revertFollow(collections.data[type], args.type);

            $scope.grouped_list[type] = setCollections(collections.data[type], type);
            //$scope.types[type] = 1;
        }
    });

    $scope.$on('orientation:change', function(event) {
        $scope.$apply(function () {
            $scope.col_width = Math.round(100 / ClipsService.getColsNumber());

            for(var type in collections.data){
                $scope.grouped_list[type] = setCollections(collections.data[type], type);
                //$scope.types[type] = 1;
            }
        });
        $ionicHistory.clearCache();
    });
});

angular.module('bazaarr').controller('CollectionListCtrl',
function($scope, $rootScope, $state, $timeout, $ionicHistory, $ionicPosition, $ionicScrollDelegate,
CollectionService, FollowService, AccountService, ToastService, HttpService, collections) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/

    setCollections(collections);

    setCover(0);
    $timeout(function() {
        setPositions();
    });
    $scope.col_width = Math.round(100 / CollectionService.getColsNumber());

    $scope.openClip = function(id, display_id, page, collection_id) {
        $state.go("clip", {clipId : id, displayId : display_id, pageId : page, collectionId : collection_id});
    };

    $scope.openCollection = function(id) {
        $state.go("collection", {colId : id});
    };

    $scope.isFirst = function(bid) {
        return !!bid === false ? true : false;
    };

    $scope.goAddCollection = function() {
        $scope.collection = {};
        $state.go("add-collection");
    };

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.followCollection = function(coll, type) {
        var send_type       = (1 === type) ? 0 : 1;
        //if ($state.includes("account.collections")) {
            var parent_index    = this.$parent.$parent.$parent.$parent.$index;
            var index           = this.$parent.$parent.$parent.$index;
            var bid = coll.bid
        /*}
        else {
            var parent_index    = this.$parent.$parent.$parent.$index;
            var index           = this.$parent.$parent.$parent.$parent.$index;
        }*/

        FollowService.followCollection(bid, send_type).then(function(data){
            $scope.collections[parent_index][index].follow = send_type;

            FollowService.followCollectionCallback(data.data.user_follow);
        });
    };

    $scope.canEdit = function() {
        if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
            return true;
        }

        return false;
    }

    $scope.$parent.doRefresh = function() {
        var promise = {};
        if ($state.includes("account.following-collections")) {
            HttpService.addNoCache("collections-followed");
            promise = FollowService.loadCollections();
        }
        else if ($state.includes("account.collections")) {
            HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
            promise = CollectionService.load2();
        }
        else {
            return false;
        }

        AccountService.update();

        promise.then(function(data) {
            setCollections(data);

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.changeCollection = function(index) {
        setCover(index);
    };

    $scope.getCover = function() {
        return {'background-image': 'url(' + $scope.cover_img + ')'};
    }

    var already_scroll = false;
    $scope.scrollCollections = function() {
        if (already_scroll) {
            return false;
        }
        already_scroll = true;

        $timeout(function() {
            setNearestCollection($ionicScrollDelegate.getScrollPosition().top);
        }, 1000);
    }

    $scope.accept_collection = function(coll, type) {
        var index           = this.$parent.$parent.$parent.$index,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            bid             = coll.bid;

        if(type == 3) {
            if(!confirm('Are you sure you want to remove this collection?')){
                return;
            }
        }

        CollectionService.accept_collection(bid, type).then(function(data){
            HttpService.addNoCache("get_user_collections/" + $rootScope.user.uid);
            if(type == 0 || type == 3){
                $scope.collections[parent_index].splice(index, 1);
                if(!$scope.collections[parent_index].length){
                    $scope.collections.splice(parent_index, 1);
                }
            } else {
                $scope.collections[parent_index][index].accepted = 1;
            }

            ToastService.showMessage("success", data.data.message);
            HttpService.clearCache();
        });
    };

    var collection_top_positions = [];
    function setPositions() {
        var collection_elements = document.querySelectorAll(".collection");
        angular.forEach(collection_elements, function(value, key) {
            collection_top_positions[key] = $ionicPosition.offset(angular.element(value)).top - 160;
        });
        collection_top_positions.push(100000);
    }

    function setNearestCollection(scroll_pos) {
//p(scroll_pos);
        var find_nearest = false;
        var scroll_to    = 0;
        var index        = 0;
//p(collection_top_positions);
        angular.forEach(collection_top_positions, function(value, key) {
            if (!find_nearest && scroll_pos < value) {
//p("Pos: " + collection_top_positions[key - 1] + " - " + scroll_pos + " - " + collection_top_positions[key]);
                scroll_to   = collection_top_positions[key];
                index       = key;
                if ((collection_top_positions[key] - scroll_pos) > (scroll_pos - collection_top_positions[key - 1])) {
                    scroll_to   = collection_top_positions[key - 1];
                    index       = key - 1;
                }
                scroll_to = 0 === index ? 0 : scroll_to;
//p(scroll_to + " - " + index);
                $ionicScrollDelegate.scrollTo(0, scroll_to, true);
                setCover(index);
                find_nearest = true;
                $timeout(function() {
                    already_scroll = false;
                }, 500);
            }
        });
    }

    function setCollections(collections) {
        if ($state.includes('account.collections') && AccountService.is_my_account
                && collections.data[collections.data.length - 1].bid != 0) {
            collections.data.push({"bid" : 0});
        }
        $scope.collections = CollectionService.prepare(collections.data);
    }

    function setCover(index) {
        if($scope.collections[index]) {
            $scope.cover_img = $scope.collections[index].cover_img;
        }
    }

    $scope.$on('collections:follow', function(event, args) {
        collections.data = CollectionService.revertFollow(collections.data, args.type);
        setCollections(collections);
    });

    $scope.$on('orientation:change', function(event) {
        $scope.$apply(function () {
            $scope.col_width = Math.round(100 / CollectionService.getColsNumber());
            /*if ($state.includes('account.collections') && AccountService.is_my_account
                    && !Object.keys($scope.collections[0]).length) {
                CollectionService.collections.unshift({});
            }*/
            $scope.collections = CollectionService.prepare(collections.data);
        });
        $ionicHistory.clearCache();
    });
});

angular.module('bazaarr').controller('CollectionCtrl',
function($scope, $state, $ionicTabsDelegate, $ionicPopup, $timeout,
CollectionService, AccountService, CollSharedService, HttpService, UserService, ToastService, collection) {
    if($state.includes('edit-collection')){
        CollectionService.tmp_collection = angular.isUndefined(collection.data) ? {} : collection.data[0];
    } else {
        if(!CollectionService.tmp_collection){
            CollectionService.tmp_collection = {};
        }
    }

    if(angular.isUndefined(CollectionService.tmp_collection) || angular.isUndefined(CollectionService.tmp_collection.bid)){
        CollectionService.tmp_collection = {
            bid: 'new'
        };
    }
    $scope.collection           = CollectionService.tmp_collection;

    $scope.shared               = {};
    $scope.shared.user_list     = {};
    $scope.search               = "";
    $scope.ionicTabsDelegate    = $ionicTabsDelegate.$getByHandle('shared-tabs');

    var sent = 0;
    var timeout_id = 0;
    $scope.checked_data = {};

    $scope.$on('form:clear', function(event, args) {
        CollectionService.tmp_collection = {
            bid: 'new'
        };
        $scope.collection = CollectionService.tmp_collection;
        $scope.checked_data = {};
    });

    if($state.includes('shared')){
        $scope.u_list = {};
        CollectionService.users[UserService.user.uid] = UserService.user.name;
        $scope.saveShared = function(data, bid){
            var tab = $scope.ionicTabsDelegate.selectedIndex(),
                params = {"bid" : bid, "type": "can_view"};
                params.uid = {};
            switch(tab){
                case 0:
                    params.uid[0] = 1;
                    $scope.checked_data = {};

                    break;
                case 1:
                    params.uid[UserService.user.uid] = 1;
                    $scope.checked_data = {};

                    break;
                case 2:
                    for(var i in data){
                        if(data[i]){
                            params.uid[i] = 1;
                        }
                    }
                    if(!Object.keys(params.uid).length){
                        ToastService.showMessage("danger", "Please select users");
                        return;
                    }

                    break;
            }

            CollectionService.tmp_collection.shared = params;
            // p(params);
            if(params.bid && /^-{0,1}\d*\.{0,1}\d+$/.test(params.bid)){
                $state.go('edit-collection', {"collectionId":  params.bid});
                return
            }

            $state.go('add-collection', {'action': 'account'});
        };

        $scope.searchUsers = function(text, fromButton){
            if(timeout_id){
                clearTimeout(timeout_id);
                timeout_id = 0;
            }
            if(text.length > 2 || fromButton && !sent){
                sent = 1;
                timeout_id = setTimeout(function(){
                    CollSharedService.searchText(text).then(function(data){
                        for(var j in $scope.checked_data){
                            if(!$scope.checked_data[j]){
                                delete $scope.checked_data[j];
                            }
                        }
                        var ln = data.data.length;
                        if(ln){
                            for(var i=0;i<ln;i++){
                                $scope.u_list[data.data[i].uid] = data.data[i].name;
                                CollSharedService.users[data.data[i].uid] = data.data[i].name;
                                if($scope.checked_data[data.data[i].uid]){
                                    continue;
                                }
                                $scope.checked_data[data.data[i].uid] = false;
                            }
                        }
                        $scope.shared.user_list = data.data;
                        sent = 0;
                    });
                }, 1000);
            }
        };

        if(angular.isUndefined(CollectionService.tmp_collection.shared) && $scope.collection.bid != 'new'){
            CollSharedService.loadData($scope.collection.bid).then(function(data){
                $scope.shared = data.data.shared_data;
                try{
                    var d = data.data.shared_data.can_view;
                    for(var i=0;i<d.length;i++){
                        $scope.u_list[d[i].uid] = d[i].name;
                        CollSharedService.users[d[i].uid] = d[i].name;
                    }
                } catch(e){
                    console.error(e);
                }
                if(typeof $scope.shared == 'undefined'){
                    return;
                }

                setTab($scope.shared.can_view);
            });
        } else {
            var shared = [];
            if(angular.isDefined(CollectionService.tmp_collection.shared)){
                // p(CollSharedService.users);
                for(var u in CollectionService.tmp_collection.shared.uid){
                    shared.push(
                        {
                            name: CollSharedService.users[u],
                            uid: u,
                        }
                    );
                }

                setTab(shared);
            }
        }
// p(CollSharedService.users);
    }

    function setTab(can_view){
        if(can_view.length){
            for(var i=0;i<can_view.length;i++){
                $scope.u_list[can_view[i].uid] = can_view[i].name;
                if(can_view[i].uid > 0) {
                    $scope.checked_data[can_view[i].uid] = true;
                }
            }
            var index = 0;

            if(can_view){
                if(can_view[0].uid == 0){
                    index = 0;
                    $scope.checked_data = {};
                } else if(i > 1){
                    index = 2;
                } else if(i == 1 && can_view[0].uid == UserService.user.uid){
                    index = 1;
                    $scope.checked_data = {};
                } else {
                    index = 2;
                }
            }

            $timeout(function(){
                $scope.ionicTabsDelegate.select(index);
            }, 200);
        }
    }

    $scope.checkWhoCanAdd = function(bid){
        if(angular.isUndefined(bid)){
            bid = "new";
        }
        CollSharedService.loadData(bid).then(function(data){
            $scope.shared = data.data.shared_data;

            if($scope.shared && $scope.shared.can_add.length){
                for(var i=0;i<$scope.shared.can_add.length;i++){
                    $scope.checked_data[$scope.shared.can_add[i].uid] = true;
                }
            }

            if($scope.shared && $scope.shared.followed.length > 0) {
                $scope.popup = $ionicPopup.show({
                    title: 'Who can add clips',
                    templateUrl: 'views/popups/inputs/collection-can-add.html',
                    cssClass: 'scroll-list',
                    scope: $scope,
                    buttons: [{
                        text: 'Cancel'
                    },{
                        text: 'Save',
                        onTap: function() {
                            var params = {
                                bid: bid,
                                type: 'can_add',
                                uid: {}
                            };

                            params[AccountService.account.uid] = 1;
                            $scope.shared.can_add = [];
                            for(var i in $scope.checked_data){
                                if($scope.checked_data[i]){
                                    params.uid[i] = 1;
                                    $scope.shared.can_add.push({"uid":i});
                                }
                            }
                            CollectionService.tmp_collection.can_add = params;
                            // CollSharedService.saveShared(params).then(function(data){

                            // });
                        }
                    }]
                });
            } else {
                ToastService.showMessage("danger", "You don't have followers");
            }
        });
    }

    $scope.title_text = Object.keys($scope.collection).length ? 'Edit collection' : 'Add Collection';

    if($state.includes('add-collection')){
        $scope.collection = {};
        CollectionService.tmp_collection = {};
    }

    if(!$scope.collection.name || $scope.collection.name == ''){
        $scope.title_text = 'Add Collection';
    }


    $scope.addCollection = function() {
        if($state.includes('add-collection')){

            for(var s in CollectionService.tmp_collection){
                $scope.collection[s] = CollectionService.tmp_collection[s];
            }
            CollectionService.tmp_collection = $scope.collection;
        }
        if(!CollectionService.tmp_collection.name){
            ToastService.showMessage("danger", "Name of Collection is required");
            return;
        }
        if(CollectionService.tmp_collection.description && CollectionService.tmp_collection.description.length > 500){
            ToastService.showMessage("danger", "Description should be under 500 symbols");
            return;
        }
        CollectionService.add(CollectionService.tmp_collection).then(function(data){
            $scope.succ_mess = "Collection succesfully added";
            if ($state.params.collectionId) {
                CollectionService.editCollectionCallback($scope.collection);
            }
            else {
                if($state.params.action != 'account'){
                    CollectionService.collectionId = data.data.bid;
                    $state.go($state.params.action, {clipId: $state.params.clipId});
                }
                CollectionService.addCollectionCallback($scope.collection);
            }
            $scope.collection = [];
            HttpService.addNoCache('user_collections');
        }, function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.deleteCollection = function(bid) {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete Collection',
            cssClass: 'confirm',
            template: 'Are you sure you want to delete this collection?'
        });
        confirmPopup.then(function(res) {
            if(res) {
                CollectionService.delete(bid).then(function(data){
                    ToastService.showMessage("success", "Collection successfully deleted");
                    HttpService.clearCache();
                    $state.go("account.collections", {userId : UserService.user.uid});
                }, function(reason) {
                    ToastService.showDrupalFormMessage("danger", reason.data);
                });
            }
        });
    }

    // CollSharedService
});

angular.module('bazaarr').controller('CollectionCoverCtrl',
function($scope, $rootScope, $state, $timeout, collection, FollowService, CollectionService,
         HttpService, ToastService, ClipsService, ClipService, CollSharedService, AccountService) {
    $scope.collection = CollectionService.collections[$state.params.colId]; //collection.data[0];

    //CollectionService.getCounters($state.params.colId);

    $scope.openClip = function(clipId) {
        if (angular.isUndefined(clipId)) {
            ToastService.showMessage("danger", "No clips in this collection");
            return false;
        }

        ClipsService.load("collection_clips", false, {bid : $state.params.colId}).then(function(data) {
            ClipsService.prepare(data.data, "", true);
            ClipService.page_list       = ClipsService.page_api_url;
            $state.go("clip", {"clipId" : clipId});
        });
    };

    $scope.followCollection = function(bid, type) {
        if(AccountService.account_id) {
            var send_type       = (1 === type) ? 0 : 1;

            FollowService.followCollection(bid, send_type).then(function(data){
                $scope.collection.follow = send_type;
                FollowService.followCollectionCallback(data.data.user_follow);
            });
        } else {
            $state.go('login');
        }
    };

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

    $scope.$on('update:collection_titles', function(event, args) {
        if (angular.isDefined(CollectionService.collections[args.bid])) {
            $scope.collection   = CollectionService.collections[args.bid];
        }
    });

    $scope.checkSharedAvatars = function(){
        var ownersMax = parseInt((window.innerWidth - 100) / 60);
        var showMoreButton = false;
        var images = document.querySelectorAll('.collection-view .col-owner img');
        var imagesCount = images.length;
        if(imagesCount > ownersMax && imagesCount > 1) {
            showMoreButton = true;
        }
        for(var i = 1; i < imagesCount; i++) {
            if(i < ownersMax) {
                images[i].style.display = 'inline-block';
            } else {
                images[i].style.display = 'none';
            }
        }
        var buttonMore = document.querySelector('.col-owner .button-more');
        if(showMoreButton) {
            buttonMore.style.display = 'inline-block';
        } else {
            buttonMore.style.display = 'none';
        }
    };

    $scope.$on('orientation:change', function(){
        $scope.checkSharedAvatars();
    });

    angular.element(document).ready($scope.checkSharedAvatars);
});

angular.module('bazaarr').controller('InputCtrl',
function($scope, $rootScope, $ionicPopup, $timeout, $state, $cordovaKeyboard, ValidateService, ToastService, AccountService) {
    $scope.openPopup = function(type, scope_var, value, title, buttons) {
        $scope.popup        = {};
        $scope.popup.model  = value;
        $scope.popup.add    = {};

        if(type.indexOf('select') === 0) {
            var default_buttons = [{
                text: 'Cancel'
            }]
        }
        if(type == 'select-color') {
            var default_buttons = [{
                text: 'Clear',
                onTap: function(){
                    $scope.search.colors_hex = '';
                }
            }, {
                text: 'Select'
            }]
        } else if(type == 'full-text') {
            var default_buttons = [{
                text: '<i class="ion-checkmark"></i>'
            }]
        } else {
            var default_buttons = [
                {
                    text: '<i class="ion-close"></i>'
                },
                {
                    text: '<i class="ion-checkmark"></i>',
                    onTap: function(e) {
                        e.preventDefault();
                        if(angular.isDefined($scope.popup.add.validate)){
                            // switch($scope.popup.add.validate){
                            //     case 'current_pass':
                            //         break;
                            // }
                            return AccountService.checkCurrentPass($scope.popup.add.current_pass).then(function() {
                                setScope();
                            }, function(reason) {
                                return false;
                            });
                        }

                        function setScope () {
                            if (!ValidateService.validate($scope.popup.model, type, title)) {
                                e.preventDefault();
                                return false;
                            }
                            scope_var = scope_var.split(".");
                            if(typeof scope_var[2] != 'undefined'){
                                if(typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
                                    $scope[scope_var[0]][scope_var[1]] = {};
                                }
                                $scope[scope_var[0]][scope_var[1]][scope_var[2]] = $scope.popup.model;
                            } else {
                                $scope[scope_var[0]][scope_var[1]] = $scope.popup.model;
                            }

                            for(var i in $scope.popup.add){
                                $scope[scope_var[0]][i] = $scope.popup.add[i];
                            }
                            $scope.popup.sel.close();
                        }

                        setScope();
                    }
                }
            ]
        }

        if(buttons){
            default_buttons = buttons;
        }

        var cssClass = type + (type.indexOf('select') === 0 ? ' select ' : '');

        if(type == 'full-text') {
            cssClass = 'full-text';
        }

        $scope.popup.sel = $ionicPopup.show({
            title: title, //(type.indexOf('select') === 0 ? 'Select ' : 'Enter ') +
            templateUrl: 'views/popups/inputs/' + type + '.html',
            scope: $scope,
            cssClass: cssClass,
            buttons: default_buttons
        });

        $timeout(function(){
            var popupInput = document.querySelector('.popup-body textarea, .popup-body input');
            if(popupInput){
                popupInput.focus();
                if ($rootScope.is_app) {
                    $cordovaKeyboard.show();
                }
            }
        }, 400);
    }
    $scope.popupSelectClick = function(name, value, title) {
        var scope_var = name.split(".");
        if(typeof value == 'object') {
            $scope[scope_var[0]][scope_var[1]+'_from'] = value[0];
            $scope[scope_var[0]][scope_var[1]+'_to'] = value[1];
            if(title) {
                $scope[scope_var[0]][scope_var[1]+'_title'] = title;
            }
            $scope[scope_var[0]][scope_var[1]] = value;
        } else {
            if(typeof scope_var[2] != 'undefined'){
                if(typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
                    $scope[scope_var[0]][scope_var[1]] = {};
                }
                $scope[scope_var[0]][scope_var[1]][scope_var[2]] = value;
                if(title) {
                    $scope[scope_var[0]][scope_var[1]][scope_var[2]+'_title'] = title;
                }
            } else {
                $scope[scope_var[0]][scope_var[1]] = value;
                if(title) {
                    $scope[scope_var[0]][scope_var[1]+'_title'] = title;
                }
            }
        }
        $scope.popup.sel.close();
    }

    $scope.goUserAccount = function(uid) {
        $scope.popup.sel.close();
        $state.go('account.collections', {'userId' : uid});
    }
});

angular.module('bazaarr').service('ValidateService', function(ToastService) {
    this.validate = function(value, type, title) {
        title = title || type;
        if (angular.isDefined(this.validate[type]) && !this.validate[type](value)) {
            ToastService.showMessage("danger", "Please, enter correct " + title.toLowerCase());
            return false;
        }

        return true;
    };

    this.validate.number = function(value) {
        var re = /^([\d]+(\.{1}[\d]{1,2})?)$/i;
        if (!re.test(value)) {
            return false;
        }

        return true;
    };

    this.validate.url = function(value) {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

        if(!pattern.test(value)) {
            return false;
        }

        return true;
    }
});

angular.module('bazaarr').service('CollectionService',
function($rootScope, $state, $q, $timeout, localStorageService, AccountService, ClipsService, HttpService, ToastService, UserService, MetaService) {
    this.collections = [];
    this.collectionId = 0;
    this.tmp_collection = {};
    this.users = {};

    this.add_clip_collection = {};

    this.accept_collection = function(bid, type) {

        HttpService.view_url = "collection/shared/" + bid;
        HttpService.params   = {"data": {"type":type}};

        return HttpService.post();
    };

    this.singleLoad = function(bid) {
        if(this.collections[bid]){
            if (this.isPrivate(this.collections[bid])) {
                return $q.reject();
            }
            return $q.when({"data": [this.collections[bid]]});
        }

        HttpService.view_url = "user_collections";
        HttpService.params   = {"bid" : bid};
        HttpService.is_auth  = false;
        HttpService.cache    = false;

        var that    = this;
        return HttpService.get().then(function(data) {
            if (that.isPrivate(data.data[0])) {
                return $q.reject();
            }

            that.collections[bid] = data.data[0];
            that.getCounters(bid);

            return data;
        });
    };

    this.isPrivate = function(collection) {
        if ((collection.access_view === "private" && collection.access_add.indexOf(parseInt(UserService.user.uid)) === -1)
            || parseInt(collection.is_private) === 1) {
            ToastService.showMessage("danger", "This is a private content. You have no access to view it.");
            return true;
        }

        return false;
    };

    this.load = function(uid) {
        var cur_uid = AccountService.account_id || UserService.user.uid;
        uid = uid || cur_uid;

        HttpService.view_url = "user_collections";
        HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;

        return HttpService.get();
    };

    this.load2 = function(uid) {
        var cur_uid = AccountService.account_id || UserService.user.uid;
        uid = uid || cur_uid;

        HttpService.view_url = "get_user_collections/" + uid;
        // HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;

        var promise = HttpService.get();
        promise.then(function() {
            var account = AccountService.getAccount();
            MetaService.set("user", "", {"name" : account.name, "about" : account.about});
        });

        return promise;
    };

    this.prepare = function(data) {
        var j = 0;

        for (var i in data) {
            if(typeof data[i].accepted != 'undefined'){
                data[i].accepted = parseInt(data[i].accepted);
            }
            // if (!!data[i].imgs === true) {

            //     data[i].imgs_r = ClipsService.applyOrientation(data[i].imgs, "collection");
            //     j++;
            // }
            if (angular.isUndefined(data[i].follow)) {
                data[i].follow = parseInt(data[i].followed);
            }

            if ($rootScope.isMyAccount() && $state.includes("account.following-collections")) {
                data[i].follow = 1;
            }

            if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
                data[i].can_edit = true;
            }
            else {
                data[i].can_edit = false;
            }

            if(data[i].access_add && data[i].access_add.length > 1) {
                data[i].is_shared = true;
            }
            else {
                data[i].is_shared = false;
            }

            this.collections[data[i].bid] = data[i];
            HttpService.addNoCache("collection-counters/" + data[i].bid);
        }

        return this.applyOrientation(data);
    };

    this.applyOrientation = function(data) {
        var cols = this.getColsNumber();

        return ClipsService.chunk_table(data, cols);
    };

    this.getColsNumber = function() {
        var cols = 3;

        if (window.matchMedia("(orientation: landscape)").matches) {
           cols = 5;
        }

        if (ionic.Platform.isIPad()) {
            cols++;
        }

        return cols;
    };

    this.add = function(collection) {
        var method = "post";
        HttpService.view_url = "collection";

        HttpService.params   = collection;


        if(collection.bid && collection.bid != 'new'){
            HttpService.view_url += "/" + collection.bid;
            return HttpService.put();
        }

        return HttpService.post();
    };

    this.delete = function(bid) {
        HttpService.view_url = "collection/" + bid;

        return HttpService.dell();
    };

    this.addCollectionCallback = function(collection) {

        ToastService.showMessage("success", "The collection " + collection.name + " is created");
        AccountService.updateCounters('collections_count', 1);

        this.editCollectionCallback(collection);
    };

    this.editCollectionCallback = function(collection) {
        if(!this.collectionId){
            HttpService.addNoCache("user_collections");
            HttpService.clearCache();
            $state.go("account.collections", {userId : UserService.user.uid});
        }
    };

    this.findCollection = function(bid) {
        var ret = "";

        var session = localStorageService.get("session");

        angular.forEach(session.collections, function(value, key) {
            if (value.bid === bid) {
                ret = value;
            }
        });
        return ret;
    };

    this.revertFollow = function(collections, type) {
        angular.forEach(collections, function(value, key) {
            value.follow = type ? 1 : 0;
        });
        return collections;
    };

    this.updateCollectionField = function(bid, field, value, operation) {
        if (angular.isUndefined(this.collections[bid]) || angular.isUndefined(this.collections[bid][field])) {
            return false;
        }

        switch (operation) {
            case "increment":
                value = parseInt(value) === 0 ? -1 : 1;
                this.collections[bid][field] = parseInt(this.collections[bid][field]) + value;
                break;
            case "update":
                this.collections[bid][field] = value;
                break;
        }
    };

    this.clear = function(bid) {
        if (!this.collections[bid]) {
            return false;
        }

        delete this.collections[bid];

        return true;
    };

    this.getCounters = function(bid) {
        if (angular.isUndefined(this.collections[bid]) || angular.isDefined(this.collections[bid].count_clips)) {
            return false;
        }

        HttpService.view_url    = "collection-counters/" + bid;
        HttpService.is_auth     = false;

        var that = this;
        HttpService.get().then(function(data) {
            angular.extend(that.collections[bid], data.data);
        });
    };
});

angular.module('bazaarr').service('CollSharedService', function(AccountService, ClipsService, HttpService) {
    // this.collection = {
    // };

    this.type = {};

    this.users = {};

    this.saveShared = function(params){

        HttpService.view_url = "shared/";
        HttpService.params = params;

        return HttpService.post();
    }

    this.loadData = function(bid){

        HttpService.view_url = "collection/" + bid;
        HttpService.params = {"data": 1};
        HttpService.cache = false;

        return HttpService.get();
    }

    this.searchText = function(text){

        HttpService.view_url = "collection/getUsers";
        HttpService.params = {"text": text};
        HttpService.cache = false;

        return HttpService.post();
    }

});
