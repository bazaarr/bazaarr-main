'use strict';
angular.module('bazaarr').controller('SearchCtrl',
function($scope, $rootScope, $state, $timeout, $ionicTabsDelegate, $ionicHistory, $cordovaKeyboard,
SearchService, ToastService, CollectionService, ClipsService, ClipService, MetaService) {

    var SEARCH_TAGS_COUNT  = 6,
        SEARCH_USERS_COUNT = 5,
        SEARCH_COLLS_COUNT = 3;

    $scope.resetSearchResults = function(is_manual) {
        $scope.search = {
            search_api_views_fulltext:  "",
            price:                      ",",
            price_title:                "All",
            field_category:             "All",
            price_type:                 0,
            price_value:                0,
            type:                       0,
            search_api_clips_types:     0,
            sort_order:                 "DESC",
            sort_order_title:           "Descending",
            sort_by:                    "created",
            sort_by_title:              "Date"
        };

        $scope.searchColors = [
            {"hex":"ffd6f6","name":"rose"},
            {"hex":"e77fbf","name":"pink"},
            {"hex":"e934aa","name":"magneta"},
            {"hex":"cc6f6f","name":"coral"},
            {"hex":"b13a3a","name":"carmine"},
            {"hex":"c1272d","name":"red"},
            {"hex":"652127","name":"maroon"},
            {"hex":"450f0f","name":"blood"},
            {"hex":"850012","name":"crimson"},
            {"hex":"ba311c","name":"tomato"},
            {"hex":"8b3220","name":"rust"},
            {"hex":"48260e","name":"chocolate"},
            {"hex":"755136","name":"brown"},
            {"hex":"5a4534","name":"soil"},
            {"hex":"564d48","name":"slate"},
            {"hex":"969182","name":"stone"},
            {"hex":"cabba2","name":"beige"},
            {"hex":"b27749","name":"sand"},
            {"hex":"ff7360","name":"tangerine"},
            {"hex":"ef5c23","name":"fire"},
            {"hex":"d5602b","name":"orange"},
            {"hex":"fa912b","name":"sunshine"},
            {"hex":"e8af49","name":"gold"},
            {"hex":"ffd297","name":"ivory"},
            {"hex":"fdff72","name":"banana"},
            {"hex":"ffe63b","name":"lemon"},
            {"hex":"948647","name":"goldenrod"},
            {"hex":"a9a032","name":"spring"},
            {"hex":"a5e32d","name":"leaf"},
            {"hex":"629c3f","name":"green"},
            {"hex":"567c34","name":"avacado"},
            {"hex":"687f67","name":"swamp"},
            {"hex":"425035","name":"forest"},
            {"hex":"1e361a","name":"jungle"},
            {"hex":"20603f","name":"emerald"},
            {"hex":"61ab89","name":"jade"},
            {"hex":"aaf1b1","name":"seafoam"},
            {"hex":"72c4c4","name":"aqua"},
            {"hex":"2b768f","name":"teal"},
            {"hex":"0086ce","name":"carribean"},
            {"hex":"052343","name":"azure"},
            {"hex":"2f4557","name":"denim"},
            {"hex":"556979","name":"steel"},
            {"hex":"7996c2","name":"stonewash"},
            {"hex":"aec8ff","name":"sky"},
            {"hex":"6394dd","name":"splash"},
            {"hex":"324ba9","name":"blue"},
            {"hex":"212b5f","name":"navy"},
            {"hex":"757adb","name":"storm"},
            {"hex":"4d2c89","name":"royal"},
            {"hex":"643f9c","name":"violet"},
            {"hex":"a261cf","name":"purple"},
            {"hex":"cca4e0","name":"lavender"},
            {"hex":"8f7c8b","name":"thistle"},
            {"hex":"6e235d","name":"mulberry"},
            {"hex":"3a2e44","name":"shadow"},
            {"hex":"292b38","name":"midnight"},
            {"hex":"000000","name":"obsidian"},
            {"hex":"333333","name":"black"},
            {"hex":"4b4946","name":"coal"},
            {"hex":"545454","name":"charcoal"},
            {"hex":"7e7e7e","name":"grey"},
            {"hex":"bbbabf","name":"silver"},
            {"hex":"c8bece","name":"platinum"},
            {"hex":"dae0f3","name":"ice"},
            {"hex":"ffffff","name":"white"},
            {"hex":"fffdea","name":"maize"}
        ];

        $scope.users        = [];
        $scope.tags        = [];
        $scope.collections  = [];

        if(is_manual) {
            document.getElementsByClassName('search-top-input')[0].value = '';
            $state.go($state.current.name, {query: ''}, {notify:false, reload:false});
        }
    };

    $scope.resetSearchResults();
    $scope.users        = [];
    $scope.collections  = [];

    CollectionService.getCategories(2).then(function(data){
        $scope.categories = data.data;
    });

    if($state.params && $state.params.query) {
        $scope.search.search_api_views_fulltext = $state.params.query;
        if($state.current.name == 'search-users') {
            SearchService.userSearch($scope.search.search_api_views_fulltext).then(function(data){
                $scope.users = data.data;
            });
        } else if ($state.current.name == 'search-collections') {
            SearchService.collectionSearch($scope.search.search_api_views_fulltext).then(function (data) {
                $scope.collections = data.data;
            });
        } /*else if ($state.current.name == 'search-clips') {
            SearchService.params = $scope.search;
            SearchService.load().then(function(data) {
                $scope.clips = data.data;
            });
        }*/ else if ($state.current.name == 'search-tags') {
            SearchService.tagSearch($scope.search.search_api_views_fulltext, 30).then(function(data){
                if(data.data.length > 0) {
                    for(var i = 0; i < data.data.length; i++) {
                        data.data[i].name = data.data[i].name.substr(1, data.data[i].name.length);
                    }
                }
                $scope.tags = data.data;
            });
        } else if ($state.current.name == 'search') {
            SearchService.tagSearch($scope.search.search_api_views_fulltext, 30).then(function(data){
                if(data.data.length > 0) {
                    for(var i = 0; i < data.data.length; i++) {
                        data.data[i].name = data.data[i].name.substr(1, data.data[i].name.length);
                    }
                }
                $scope.tags = data.data;
            });
            SearchService.userSearch($scope.search.search_api_views_fulltext, SEARCH_USERS_COUNT).then(function(data){
                $scope.users = data.data;
            });
            SearchService.collectionSearch($scope.search.search_api_views_fulltext, SEARCH_COLLS_COUNT).then(function(data){
                $scope.collections = data.data;
            });
            $scope.is_load_more = false;
            SearchService.params = $scope.search;
            SearchService.load().then(function(data) {
                $scope.clips = data.data;
            });
        }
    }

    /*
     * Function to hide keyboard on the IOS 8 if blur() doesn't work
     */
    function unfocusSearch() {
        document.activeElement.blur();
        if ($rootScope.is_app && ionic.Platform.isIOS()) {
            $cordovaKeyboard.close();
        }
    }

    (function (timer, delay) {
        $scope.goSearchResults= function (search) {
            if(timer){
                $timeout.cancel(timer)
            }
            timer = $timeout(function(){
                if (search.search_api_views_fulltext && search.search_api_views_fulltext.length >= 1) {
                    if($state.current.name == 'search-users') {
                        SearchService.userSearch(search.search_api_views_fulltext).then(function(data){
                            $scope.users = data.data;
                        });
                    } else if ($state.current.name == 'search-collections') {
                        SearchService.collectionSearch(search.search_api_views_fulltext).then(function(data){
                            $scope.collections = data.data;
                        });
                    } /*else if ($state.current.name == 'search-clips') {
                        SearchService.params = search;
                        SearchService.load().then(function(data) {
                            //$scope.$parent.$parent.clips = data.data;//ClipsService.prepare(data.data);
                            $scope.clips = data.data;//ClipsService.prepare(data.data);
                        });
                    }*/ else if ($state.current.name == 'search-tags') {
                        SearchService.params = search;
                        SearchService.tagSearch(search.search_api_views_fulltext, 30).then(function(data){
                            if(data.data.length > 0) {
                                for(var i = 0; i < data.data.length; i++) {
                                    data.data[i].name = data.data[i].name.substr(1, data.data[i].name.length);
                                }
                            }
                            $scope.tags = data.data;
                        });
                    } else if ($state.current.name == 'search') {
                        SearchService.tagSearch(search.search_api_views_fulltext, SEARCH_TAGS_COUNT).then(function(data){
                            if(data.data.length > 0) {
                                for(var i = 0; i < data.data.length; i++) {
                                    data.data[i].name = data.data[i].name.substr(1, data.data[i].name.length);
                                }
                            }
                            $scope.tags = data.data;
                        });
                        SearchService.userSearch(search.search_api_views_fulltext, SEARCH_USERS_COUNT).then(function(data){
                            $scope.users = data.data;
                        });
                        SearchService.collectionSearch(search.search_api_views_fulltext, SEARCH_COLLS_COUNT).then(function(data){
                            $scope.collections = data.data;
                        });
                        $scope.is_load_more = false;
                        SearchService.params = search;
                        SearchService.load().then(function(data) {
                            $scope.clips = data.data;//ClipsService.prepare(data.data);
                        });
                    }
                    $state.go($state.current.name, {query: search.search_api_views_fulltext}, {notify:false, reload:false});
                } else {
                    ToastService.showMessage("danger", "Please enter 1 or more symbols");
                }
            }, delay)
        };
    })(false, 600);

    $scope.goSearch = function() {
        $state.go('search');
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };
    $scope.selectColor = function(hex){
        //if(r && g && b) {
            if($scope.search.colors_hex == hex) {
                $scope.search.colors_hex = '';
            } else {
                $scope.search.colors_hex = hex;
            }
        //}
    };
    $scope.checkColor = function(hex){
        if($scope.search.colors_hex == hex) {
            return 'active';
        }
    };
    $scope.selectType = function(type, from, to) {
        // switch(type){
        //     case 0:
        //     case 1:
        //         if($scope.search.sort_by == 'price_value'){
        //             $scope.search.sort_by           = 'created';
        //             $scope.search.sort_by_title     = 'Date';
        //             $scope.search.sort_order        = 'DESC';
        //             $scope.search.sort_order_title  = 'Descending';
        //         }
        //         break;
        //     case 2:
        //         if($scope.search.sort_by == 'created'){
        //             $scope.search.sort_by           = 'price_value';
        //             $scope.search.sort_by_title     = 'Price';
        //             $scope.search.sort_order        = 'ASC';
        //             $scope.search.sort_order_title  = 'Ascending';
        //         }
        //         break;
        // }

        $scope.search.price = from + ',' + to;
        $scope.search.price_value = from;

        if(type == 1) {
            if($scope.search.price_type != type) {
                $scope.search.lastSort = $scope.search.sort_by;
            }
            $scope.search.sort_by           = 'created';
            $scope.search.sort_by_title     = 'Date';
            // $scope.search.sort_order        = 'DESC';
            // $scope.search.sort_order_title  = 'Descending';
        } else {
            if($scope.search.lastSort && $scope.search.lastSort == 'price_value') {
                $scope.search.sort_by           = 'price_value';
                $scope.search.sort_by_title     = 'Price';
                // $scope.search.sort_order        = 'ASC';
                // $scope.search.sort_order_title  = 'Ascending';
            }
        }

        if(type == 2 && $scope.search.price_value_1 > 0) {
            $scope.search.price_type = type;
        } else {
            $scope.search.price_value_1 = to;
            $scope.search.price_type = type;
        }
    };
    $scope.selectSeachType = function(type) {
        $scope.search.type = type;
    };

    $scope.searchInputKeyPress = function(e, search) {
        // console.log(e);
        $timeout(function() {
            if (e.keyCode == 13 || search.search_api_views_fulltext.length > 1) {
                $scope.goSearchResults(search);
            }
        });
    };

    $scope.openClip = function(clip) {
        ClipService.page_list = ClipsService.page_api_url;
        ClipService.preloadImage(clip.img_large);
        $state.go("clip", {clipId : clip.nid}).then(function() {

        });
    };

    $scope.saveFilters = function() {
        //$scope.clips = {};
	$ionicHistory.clearCache();
	$rootScope.backEvent = true;
	delete $scope.search.search_api_views_fulltext;
        angular.extend(SearchService.params, $scope.search);
        $state.go('search-clips', {query: SearchService.params.search_api_views_fulltext});
    }
});

angular.module('bazaarr').service('SearchService',
function($state, $ionicLoading, UserService, server_url, HttpService, ClipsService, MetaService) {
    this.params = {};

    this.page = 0;

    this.init = function() {
        MetaService.set("search");
    };

    this.loadMore = function() {
        ClipsService.is_more = true;
        this.page += 1;
        return this.load();
    };

    this.collectionSearch = function(search, limit){
        HttpService.view_url        = 'collections-search';
        HttpService.is_auth         = false;
        HttpService.show_loading    = false;
        HttpService.params = {
            name: search
        };
        if(limit) {
            HttpService.params.limit = limit;
        }

        return HttpService.get();
    }

    this.userSearch = function(search, limit){
        HttpService.view_url        = 'user-search';
        HttpService.is_auth         = false;
        HttpService.show_loading    = false;
        HttpService.params = {
            name: search
        };
        if(limit) {
            HttpService.params.limit = limit;
        }

        return HttpService.get();
    }

    this.tagSearch = function(search, limit){
        HttpService.view_url        = 'search-tags';
        HttpService.is_auth         = false;
        HttpService.show_loading    = false;
        HttpService.params = {
            name: search
        };
        if(limit) {
            HttpService.params.limit = limit;
        }

        return HttpService.get();
    }

    this.load = function() {
        HttpService.view_url        = 'views/solr_clip_search';
        HttpService.page            = this.page;
        HttpService.params          = this.params;
        HttpService.cache           = false;
        HttpService.is_auth         = false;
        HttpService.show_loading    = false;

        if (!HttpService.page) {
            ClipsService.newArr["search"]     = [];
            ClipsService.newArrSize["search"] = [];
            ClipsService.is_more = false;

            ClipsService.page_api_url = "search";
            ClipsService.is_user_page = false;
            //$ionicLoading.show();
        }

        var ret = HttpService.get();
        ret.then(function(data) {
            //$ionicLoading.hide();
        })

        return ret;

        //return HttpService.get();
    };

    this.getTitle = function() {
        if (!Object.keys(this.params).length
                || !!this.params.search_api_views_fulltext === false
                || !this.params.search_api_views_fulltext) {
            return "";
        }

        return decodeURIComponent(this.params.search_api_views_fulltext);
    };

    this.isSearch = function() {
        if ($state) {
            return $state.includes('search-clips');
        }

        if (Object.keys(this.params).length) {
            return true;
        }

        return false;
    };
});