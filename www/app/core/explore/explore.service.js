angular.module('bazaarr').service('ExploreService', function($q, $state, ClipsService, FollowService) {
    this.count = 6;
    this.order = ["recent", "shop", "popular", "brands"];

    this.load = function() {
        var promises = {
            recent      : ClipsService.loadAdapter("explore-recent", false),
            shop        : ClipsService.loadAdapter("explore-shop", false),
            popular     : ClipsService.loadAdapter("explore-popular", false),
            brands      : ClipsService.loadAdapter("explore-brands", false)
        };

        var promise = $q.all(promises);

        promise.then(function(data) {
            angular.forEach(data, function(value, key) {
                if(key != 'brands') {
                    ClipsService.prepare(value.data, "explore-" + key);
                }
            })
        })

        return promise;
    };

    this.loadTitles = function() {
        var titles = {
            recent : {
                title         : "Recent Clips",
                description   : "Landing description"
            },
            shop : {
                title         : "Shop Clips",
                description   : "Landing2 description"
            },
            popular : {
                title         : "Popular Clips",
                description   : "Landing description"
            },
            brands : {
                title         : "Brands",
                description   : "Landing description"
            }
        };

        return titles;
    };
});
