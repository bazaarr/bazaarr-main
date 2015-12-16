angular.module('bazaarr').directive('menuFollow', function($state){
    var menus = [
            {name : "Clips", state : "following"},
            {name : "Collections", state : "following-collections"},
            {name : "Tags", state : "following-tags"},
            {name : "Users", state : "following-users"}
        ];
    
    return {
        replace : true,
        scope: {},
        restrict: 'E',
        templateUrl: 'app/common/menu/follow/menu-follow.view.html',
        controller: function($scope, StateService) {    
            $scope.show_menu    = true;
            $scope.menus        = menus;
            $scope.go           = StateService.go;
        },
        link : function(scope) {
            scope.active = false;
            menus.map(function(menu) {
                menu.is_active = false;
                if (menu.state === $state.current.name) {
                    menu.is_active  = true;
                    scope.active    = true;
                }
            });
        }
    };
});