angular.module('starter.services', [])

    .service('Auth', function () {
        var self = this;

        self._value = '';

        self.current = function () {
            var value = localStorage.getItem('userid');
            if (!value) return false;
            self._value = value;
            return self._value;
        };

        self.empty = function () {
            localStorage.removeItem('userid');
            self._value = '';
            return true;
        };

        self.has = function () {
            var value = localStorage.getItem('userid');
            return !_.isUndefined(value) && !_.isNull(value) && value !== 'undefined';
        };

        self.token = function () {
            var value = localStorage.getItem('userid');
            var userjson = JSON.parse(localStorage.getItem(value))
            return userjson.Token
        }

        self.set = function (data) {
            var key = data.UserName;
            localStorage.setItem('userid', key);

            var userdata = JSON.parse(localStorage.getItem(key))
            if (userdata) { // 对于已经登陆过用户重新登录,只更新token
                userdata.Token = data.Token
            }
            else {
                userdata = {
                    Token: data.Token,
                    Loaded: false
                }
                delete data.Token
                userdata.User = data
                userdata.Audits = []
            }
            localStorage.setItem(key, JSON.stringify(userdata))
        };
    })

    .service('LocalData', function (Auth, DataService) {
        var localData = {}

        function init(fn) {
            var userId = Auth.current()
            var user = JSON.parse(localStorage.getItem(userId))
            if (!user.Loaded) {
                loadService(fn)
            }
            else {
                loadLocalData(user, fn)
            }
        }

        function removeAuditsHistory() {
            var userId = Auth.current()

            var user = JSON.parse(localStorage.getItem(userId))
            var audits = user.Audits

            //没到200条 不删除记录
            if (audits.length < 200)
                return;

            var unsync = _.filter(audits, function (audit) {
                return !audit.IsSync || audit.IsSync === false
            })
            //有没有同步过的 不删除记录
            if (unsync.length > 0) {
                return;
            }

            var index = audits.length - 200;
            audits.splice(index, 200)

            user.Audits = audits;
            localStorage.setItem(userId, JSON.stringify(user))

            if (!localData.AuditDataList)
                localData.AuditDataList = []
            localData.AuditDataList = audits
        }

        function loadLocalData(data, fn) {
            localData.Token = data.Token
            localData.AuditDataList = data.Audits
            localData.User = data.User
            localData.AuditPersonList = data.AuditPersonList
            localData.ShipInfo = data.ShipInfo
            localData.AuditStepSettings = data.AuditStepSettings

            //清除audits的历史记录
            removeAuditsHistory()
            fn()
        }

        function loadService(fn) {
            var userId = Auth.current()
            DataService.getShipSetting()
                .then(function (data) {
                    var user = JSON.parse(localStorage.getItem(userId))
                    user.Loaded = true
                    user.AuditPersonList = data.PersonList
                    user.ShipInfo = data.Info
                    user.AuditStepSettings = data.StepSet

                    localStorage.setItem(userId, JSON.stringify(user))
                    loadLocalData(user, fn)
                })
        }

        function guid() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        }

        function dropAudit(audit) {
            var userId = Auth.current()

            var user = JSON.parse(localStorage.getItem(userId))
            var audits = user.Audits

            var index = _.findIndex(audits, function (a) {
                return a.Id === audit.Id
            })
            audits.splice(index, 1);
            user.Audits = audits;

            localStorage.setItem(userId, JSON.stringify(user))
            if (!localData.AuditDataList)
                localData.AuditDataList = []
            localData.AuditDataList = audits
        }

        function saveAudits(audit) {
            var userId = Auth.current()

            var user = JSON.parse(localStorage.getItem(userId))
            var audits = user.Audits

            var index = _.findIndex(audits, function (a) {
                return a.Id === audit.Id
            })
            if (index !== -1) {
                audits[index] = audit
            }
            else {
                audits.push(audit)
            }
            user.Audits = audits;

            var auditsjson = JSON.stringify(user)
            localStorage.setItem(userId, auditsjson)
            if (!localData.AuditDataList)
                localData.AuditDataList = []
            localData.AuditDataList = audits
        }

        function syncAudit(id) {
            var userId = Auth.current()

            var user = JSON.parse(localStorage.getItem(userId))
            var audits = user.Audits

            var index = _.findIndex(audits, function (a) {
                return a.Id === id
            })
            if (index !== -1) {
                audits[index].IsSync = true
            }

            user.Audits = audits;

            var auditsjson = JSON.stringify(user)
            localStorage.setItem(userId, auditsjson)
            if (!localData.AuditDataList)
                localData.AuditDataList = []
            localData.AuditDataList = audits
        }

        function syncAuditImage(id, images) {
            var userId = Auth.current()

            var user = JSON.parse(localStorage.getItem(userId))
            var audits = user.Audits

            var index = _.findIndex(audits, function (a) {
                return a.Id === id
            })
            if (index !== -1) {
                audits[index].Images = images
            }

            user.Audits = audits;

            var auditsjson = JSON.stringify(user)
            localStorage.setItem(userId, auditsjson)

            if (!localData.AuditDataList)
                localData.AuditDataList = []
            localData.AuditDataList = audits
        }

        localData.init = init;
        localData.guid = guid;
        localData.saveAudits = saveAudits;
        localData.dropAudit = dropAudit;
        localData.syncAudit = syncAudit;
        localData.syncAuditImage = syncAuditImage;
        localData.loadService = loadService;

        return localData;
    })

    .service('DataService', function ($http, Auth, $q, LoadingService, AlertService) {
        var querystring = function (obj) {
            var p = [];
            for (var key in obj) {
                p.push(key + '=' + encodeURIComponent(obj[key]));
            }
            return p.join('&');
        };

        function HTTP_GET(url, showLoading) {
            if (_.isUndefined(showLoading) || _.isNull(showLoading)) {
                showLoading = true;
            }

            if (showLoading)
                LoadingService.Show();

            var deferred = $q.defer();

            url = "http://xunjian.lewei50.com/" + url

            console.log('http get---------------------->', url);

            var req = {
                method: 'GET',
                url: url,
                timeout: 1000 * 20
            };

            $http(req)
                .success(function (data, status, headers, config) {
                    if (data.Successful) {
                        deferred.resolve(data.Data);
                    }
                    else {
                        AlertService.Alert("服务出错" + data.Message)
                    }
                    if (showLoading) LoadingService.Hide();
                })
                .error(function (data, status, headers, config) {
                    deferred.reject(data);
                    if (showLoading) LoadingService.Hide();
                    AlertService.Alert("网络不稳定，请稍后在试。");
                });

            return deferred.promise;
        }

        function HTTP_POST(url, params, showLoading) {
            if (_.isUndefined(showLoading) || _.isNull(showLoading)) {
                showLoading = true;
            }

            if (showLoading)
                LoadingService.Show();

            url = "http://xunjian.lewei50.com/" + url

            var deferred = $q.defer();

            console.log('http post---------------------->', url);

            var req = {
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: JSON.stringify(params),
                timeout: 1000 * 20
            };

            $http(req).
                success(function (data, status, headers, config) {
                    if (data.Successful) {
                        deferred.resolve(data.Data);
                    }
                    else {
                        AlertService.Alert("服务出错" + data.Message)
                    }
                    if (showLoading) LoadingService.Hide();
                }).
                error(function (data, status, headers, config) {
                    deferred.reject(data);
                    if (showLoading) LoadingService.Hide();
                    AlertService.Alert("网络不稳定，请稍后在试。");
                });
            return deferred.promise;
        }

        var service = {}
        service.getShipSetting = function () {
            var token = Auth.token()
            var url = "api/v1/shipAudit/getshipsetting?token=" + token
            return HTTP_GET(url, true)
        }

        service.login = function (username, pwd) {
            var url = "api/v1/user/login?username=" + username + "&pwd=" + pwd
            return HTTP_GET(url, true)
        }

        service.sync = function (audit) {
            _.each(audit.StepsData, function (step) {
                step.Images = []
                _.each(audit.Images, function (image) {
                    if (image.Id === step.Id) {
                        step.Images.push(image.targetUrl)
                    }
                })
            })

            var StepData = _.map(audit.StepsData, function (s) {
                var step = {
                    StepSetId: s.Setting.Id,
                    StartTime: s.StartTime,
                    EndTime: s.EndTime,
                    IsQRSkip: s.IsQRSkip,
                    Result: s.Status == 1 ? false : true
                }
                step.ExceptionNoStrs = s.ExceptionIds.join(',')
                step.ImageUrl = s.Images.join(',')
                return step;
            })
            var postAudit = {
                Id: audit.Id,
                EmployeeId: audit.EmployeeId,
                StartTime: audit.StartTime,
                EndTime: audit.EndTime,
                Result: audit.Status == 1 ? false : true,
                ResultMessage: audit.Result,
                StepData: StepData
            }

            var token = Auth.token()
            var url = "api/v1/shipAudit/CommitData?token=" + token
            return HTTP_POST(url, postAudit, false)
        }
        return service;
    })

    .service('LoadingService', function ($ionicLoading) {
        var service = {
            Show: function (content) {
                content = content || '数据加载中';
                // Show the loading overlay and text
                $ionicLoading.show({
                    template: '<ion-spinner icon="bubbles" class="spinner-balanced"></ion-spinner>' + content
                });
            },
            Hide: function () {
                $ionicLoading.hide();
            }
        };
        return service;
    })

    .service('AlertService', function ($ionicPopup, $ionicModal, $q, $rootScope) {
        var service = {};

        service.ConfirmAudit = function (content, title, fnOK, fnCancel) {
            $ionicPopup.confirm({
                title: title || "确认",
                template: _pipe(content),
                okType: 'button-balanced',
                okText: '继续巡检',
                cancelType: 'button-light',
                cancelText: '取消巡检'
            }).then(function (res) {
                if (res) {
                    if (fnOK != null)
                        fnOK();
                } else {
                    if (fnCancel != null)
                        fnCancel();
                }
            });
        };

        service.Confirm = function (content, title, fnOK, fnCancel) {
            $ionicPopup.confirm({
                title: title || "确认",
                template: _pipe(content),
                okType: 'button-balanced',
                okText: '确定',
                cancelType: 'button-light',
                cancelText: '取消'
            }).then(function (res) {
                if (res) {
                    if (fnOK != null)
                        fnOK();
                } else {
                    if (fnCancel != null)
                        fnCancel();
                }
            });
        };

        function _pipe(msg) {
            if (typeof msg !== 'string') {
                if (msg && typeof msg.message === 'string') return msg.message;
                return '服务出错，请稍后再试';
            }
            return msg;
        }

        service.Alert = function (content, title, fn) {
            $ionicPopup.alert({
                title: title || '提示',
                template: _pipe(content),
                okType: 'button-balanced',
                okText: '确定'
            }).then(function (res) {
                if (fn != null)
                    fn(res);
            });
        };

        return service;
    })
