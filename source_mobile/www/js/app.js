// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ngCordova', 'ionic', 'starter.controllers', 'starter.services'])

  .run(function ($ionicPlatform, $ionicPopup, $ionicHistory) {
    $ionicPlatform.ready(function () {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);
      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
    });


    $ionicPlatform.registerBackButtonAction(function (e) {
      console.log($ionicHistory.viewHistory());
      var stateName = $ionicHistory.currentStateName();
      var back = true;//允许自动判断并后退
      switch (stateName) {
        case "tab.dash":
          var confirmPopup = $ionicPopup.confirm({
            title: '用户提示',
            template: '确定要退出吗',
            okText:'确定',
            cancelText:'取消'
          });
          confirmPopup.then(function (res) {
            if (res) {
              ionic.Platform.exitApp();
            }
          });
          back = false;
          break;
        default:
          break;
      }
      if (back)
        $ionicHistory.goBack();
      else
        e.preventDefault();
    }, 101);

  })

  .config(function ($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position("bottom");
    $ionicConfigProvider.backButton.previousTitleText(false);
    $ionicConfigProvider.backButton.text('返回').icon('ion-chevron-left');
    $ionicConfigProvider.tabs.style('standard');
    $ionicConfigProvider.spinner.icon('android');
    $ionicConfigProvider.navBar.alignTitle('center')
  })

  .config(function ($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

      // setup an abstract state for the tabs directive
      .state('tab', {
        url: '/tab',
        abstract: true,
        templateUrl: 'templates/tabs.html'
      })

      .state('signin', {
        url: '/signin',
        controller: 'SigninCtrl',
        templateUrl: 'templates/signin.html',
        cache: false
      })

      .state('sync', {
        url: '/sync',
        controller: 'SyncCtrl',
        templateUrl: 'templates/sync.html',
        cache: false
      })

      .state('users', {
        url: '/users',
        controller: 'UsersCtrl',
        templateUrl: 'templates/users.html',
        cache: false
      })


      .state('tab.dash', {
        url: '/dash',
        views: {
          'tab-dash': {
            templateUrl: 'templates/dash.html',
            controller: 'DashCtrl'
          }
        },
        cache: false
      })

      .state('tab.audits', {
        url: '/audits',
        views: {
          'tab-audits': {
            templateUrl: 'templates/audits.html',
            controller: 'AuditsCtrl'
          }
        },
        cache: false
      })

      .state('audit', {
        url: '/audit/:auditId',
        templateUrl: 'templates/audit.html',
        controller: 'AuditCtrl',
        cache: false
      })

      .state('tab.audit-detail', {
        url: '/audit-detail/:id',
        views: {
          'tab-audits': {
            templateUrl: 'templates/audit-detail.html',
            controller: 'AuditDetailCtrl'
          }
        },
        cache: false
      })

      .state('tab.audit-step-detail', {
        url: '/audit-step-detail/:auditId/:stepId',
        views: {
          'tab-audits': {
            templateUrl: 'templates/audit-step-detail.html',
            controller: 'AuditStepDetailCtrl'
          }
        },
        cache: false
      })

      .state('tab.setting', {
        url: '/setting',
        views: {
          'tab-setting': {
            templateUrl: 'templates/setting.html',
            controller: 'SettingCtrl'
          }
        },
        cache: false
      });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/dash');
  });
