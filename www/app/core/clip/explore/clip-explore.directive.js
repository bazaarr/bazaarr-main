angular.module('bazaarr').directive('clipExplore', function($state, ClipsService) {
    return {
        replace: true,
        scope: {
            clip    : "=",
            display : "="
        },
        restrict: 'E',
        templateUrl: 'app/core/clip/explore/clip-explore.view.html',
        link: function(scope, element) {
            element.on("tap", function() {
                ClipsService.page_api_url = scope.display;
                $state.go("clip", {clipId : scope.clip.nid});
            });
        }
    };
});