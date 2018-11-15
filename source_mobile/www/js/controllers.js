angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $state, Auth, LocalData, AlertService) {
    if (!Auth.has()) {
        return $state.go('signin');
    }

    LocalData.init(function() {
        $scope.ship = LocalData.ShipInfo;
        $scope.ship.img = 'img/ship/' + $scope.ship.Code + '.jpg'

        $scope.data = {
            unSync: 0
        }

        _.each($scope.audits, function(audit) {
            if (!audit.IsSync) {
                $scope.data.unSync = Number($scope.data.unSync) + 1
            }
        })
    });

    $scope.create = function() {
        var index = _.findIndex(LocalData.AuditDataList, function(audit) {
            return audit.IsComplete === 1
        })
        if (index === -1) {
            $state.go('audit', {auditId: 0})
        }
        else {
            AlertService.ConfirmAudit("您有未完成的巡检，请选择？", "用户确认",
                function() {
                    $state.go('audit', {auditId: LocalData.AuditDataList[index].Id})
                }, function() {
                    LocalData.dropAudit(LocalData.AuditDataList[index])
                    $state.go('audit', {auditId: 0})
                })
        }
    }
})

.controller('AuditsCtrl', function($scope, LocalData) {
    _.each(LocalData.AuditDataList, function(audit) {
        audit.Employee = _.find(LocalData.AuditPersonList, function(e) {
            return e.EmployId == audit.EmployeeId
        })
    })
    $scope.audits = LocalData.AuditDataList;
    console.log($scope.audits)
})

.controller('AuditCtrl', function($scope, $state, $stateParams, LocalData, AlertService, $cordovaCamera, $cordovaBarcodeScanner) {
    $scope.employees = LocalData.AuditPersonList;
    $scope.ship = LocalData.ShipInfo;

    $scope.auditId = $stateParams.auditId;

    $scope.steps = LocalData.AuditStepSettings;
    _.each($scope.steps, function(step) {
        step.status = 'start'
        step.Description = step.Description.replace(new RegExp("\n", 'g'), "<br/>")
    })

    $scope.s = 0;

    //初始化所有步骤的初识数据
    var stepsData = _.map($scope.steps, function(step) {
        return {
            Id: LocalData.guid(),
            Setting: {
                Id: step.Id,
                Title: step.Title,
                Place: step.Place
            },
            Status: 0,
            StartTime: moment().toDate(),
            Result: "正常",
            ExceptionIds: [],
            ExceptionImages: [],
            //未完成
            IsComplete: 1
        }
    })

    $scope.audit = {
        Id: LocalData.guid(),
        EmployeeId: $scope.employees[0].EmployId,
        StartTime: moment().toDate(),
        StepsData: stepsData,
        IsComplete: 1,
        Result: "正常",
        Status: 0
    }

    //新创建
    if ($scope.auditId == 0) {
        $scope.loaded = true;
    }
    else {
        $scope.loaded = false;
        var index = _.findIndex(LocalData.AuditDataList, function(audit) {
            return audit.Id === $scope.auditId
        });

        $scope.audit = LocalData.AuditDataList[index];

        if ($scope.audit.StepsData) {
            var index = _.findIndex($scope.audit.StepsData, function(s) {
                return s.IsComplete === 1
            })
            if (index !== -1) {
                $scope.s = index
            }
            else {
                return $state.go('tab.audits')
            }
        }
        else {
            $scope.audit.StepsData = stepsData;
        }
    }

    $scope.start = function() {
        $scope.loaded = false;
    }

    $scope.scan = function(step) {
        $cordovaBarcodeScanner
            .scan()
            .then(function(barcodeData) {
                if (step.QRContent === barcodeData.text) {
                    step.status = 'confirm'
                    $scope.audit.StepsData[$scope.s].Result = step.QRContent
                }
                else {
                    AlertService.Alert("二维码扫描结果不正确")
                }
            }, function(error) {
                AlertService.Alert('扫描出错，清选择跳过')
            });
    }

    $scope.skip = function(step) {
        AlertService.Confirm("确定跳过该步骤吗？","系统提示", function() {
            step.status = 'confirm'
            $scope.audit.StepsData[$scope.s].Result = "出现问题，跳过扫描。";
            $scope.audit.StepsData[$scope.s].IsQRSkip = true;
        })
    }

    $scope.takeImage = function () {
        var options = {
            quality: 70,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.CAMERA,
            correctOrientation: true,
            encodingType: Camera.EncodingType.JPEG,
            allowEdit: false,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };

        $cordovaCamera.getPicture(options).then(function (imageURI) {
            window.resolveLocalFileSystemURL(imageURI, function (fileEntry) {
                $scope.audit.StepsData[$scope.s].ExceptionImages.push(fileEntry.toURL());
                $scope.$apply();
            });
        }, function (err) {
            AlertService.Alert("拍照错误.");
        });
    };

    $scope.removeImage = function(image) {
        var index = _.findIndex($scope.audit.StepsData[$scope.s].ExceptionImages, function(i) {
            return i === image;
        })
        $scope.audit.StepsData[$scope.s].ExceptionImages.splice(index, 1)
    }

    $scope.success = function(step) {
        step.status = 'complete'
        next()
    }

    $scope.fail = function(step) {
        step.status = 'exception'
        _.each(step.ExceptionList, function(exception) {
            exception.selected = false
        });
    }

    $scope.exception = function(step) {
        if ($scope.audit.StepsData[$scope.s].ExceptionImages.length === 0) {
            return AlertService.Alert("您还没有拍照，请拍照")
        }

        step.status = 'complete'

        var exceptions = _.filter(step.ExceptionList, function(exception) {
            return exception.selected
        })

        $scope.audit.StepsData[$scope.s].ExceptionIds = _.map(exceptions, function(exception) {
            return exception.Idx
        })
        $scope.audit.StepsData[$scope.s].Status = 1,
        $scope.audit.StepsData[$scope.s].Result = "异常"

        next()
    }

    function next() {
        if ($scope.s === ($scope.steps.length - 1)) {
            complete(true)
            AlertService.Alert("巡检结束")
            $state.go('tab.audits')
        }
        if ($scope.s < ($scope.steps.length - 1)) {
            complete(false)
            $scope.s = $scope.s + 1
            //初始化下一步的开始时间
            $scope.audit.StepsData[$scope.s].StartTime = moment().toDate();
        }
    }

    // 每次进入下一步的时候存储audit
    function complete(finish) {
        if (finish) {
            $scope.audit.IsComplete = 0;
            $scope.audit.EndTime = moment().toDate();

            //把所有audit的异常图片汇总, 用来同步上传
            $scope.audit.Images = []

            _.each($scope.audit.StepsData, function(step) {
                _.each(step.ExceptionImages, function(image) {
                    $scope.audit.Images.push({
                        Id: step.Id,
                        isSync: false,
                        url: image
                    })
                })
            })
        }

        var s = _.filter($scope.audit.StepsData, function(step) {
            if (step.Status == 1) {
                return true
            }
        })

        $scope.audit.StepsData[$scope.s].IsComplete = 0;
        $scope.audit.StepsData[$scope.s].EndTime = moment().toDate();

        if (s.length > 0) {
            $scope.audit.Result = "异常"
            $scope.audit.Status = 1
        }

        console.log($scope.audit)

        LocalData.saveAudits($scope.audit)
    }
})

.controller('AuditDetailCtrl', function($scope, $state, $stateParams, LocalData) {
    var auditid = $stateParams.id;
    $scope.audits = LocalData.AuditDataList;
    _.each(LocalData.AuditDataList, function(audit) {
        audit.Employee = _.find(LocalData.AuditPersonList, function(e) {return e.EmployId == audit.EmployeeId})
    })
    $scope.audit = _.find(LocalData.AuditDataList, function(a) {
        return a.Id == auditid
    })

    $scope.steps = $scope.audit.StepsData;

    $scope.drop = function(audit) {
        LocalData.dropAudit(audit)
        $state.go('tab.audits')
    }

    console.log($scope.steps)
})

.controller('AuditStepDetailCtrl', function($scope, $state, $stateParams, LocalData) {
    var auditId = $stateParams.auditId;
    var stepId = $stateParams.stepId;

    $scope.audit = _.find(LocalData.AuditDataList, function(audit) {
        return audit.Id == auditId
    })

    $scope.step = _.find($scope.audit.StepsData, function(step) {
        return step.Id == stepId
    })

    console.log($scope.step)
})

.controller('SyncCtrl', function($scope, $state, LocalData, AlertService, DataService, $cordovaFileTransfer) {
    $scope.audits = LocalData.AuditDataList;

    console.log($scope.audits)

    $scope.data = {
        unSync: 0,
        unComplete: 0,
        total: 0
    }

    _.each($scope.audits, function(audit) {
        if (audit.IsComplete === 1) {
            $scope.data.unComplete = Number($scope.data.unComplete) + 1
        }
        if (!audit.IsSync) {
            $scope.data.unSync = Number($scope.data.unSync) + 1
        }
        $scope.data.total = Number($scope.data.total) + 1
    })

    $scope.isStart = false;

    $scope.start = function() {
        if ($scope.isStart)
            return AlertService("正在同步中");

        $scope.isStart = true;
        sync()
    }

    $scope.images = []
    $scope.currentAudit = null;

    function sync() {
        if ($scope.isStart) {
            $scope.currentAudit = $scope.audits.pop()
            //已经结束并且没有同步过
            if ($scope.currentAudit) {
                if ($scope.currentAudit.IsComplete === 0 && !$scope.currentAudit.IsSync) {
                    var audit = _.find($scope.audits, function(a){
                        return a.Id == $scope.currentAudit.Id
                    })
                    angular.copy($scope.currentAudit.Images, $scope.images);
                    upload()
                }
                else {
                    sync()
                }
            }
            else {
                //sync completed
                $scope.isStart = false;
                AlertService.Alert('同步结束');
            }
        }
    }

    function uploadCompleted() {
        DataService.sync($scope.currentAudit)
            .then(function(data) {
                $scope.data.unSync = Number($scope.data.unSync) - 1
                LocalData.syncAudit($scope.currentAudit.Id)
                sync()
            })
    }

    function upload() {
        if ($scope.isStart) {
            var image = $scope.images.pop();
            if (image) {
                //同步图片
                uploadImage(image, function(status) {
                    if (status === 'error') {
                        $scope.images.push(image)
                    }
                    upload() //上传成功 继续上传
                })
            }
            else { //图片上传结束
                uploadCompleted()
            }
        }
    }

    function uploadImage(image, fn) {
        if (image.isSnyc) {
            fn()
        }

        var imageurl = image.url
        var server = "http://pms.lewei50.com/api/v1/upload/picupload";

        var trustHosts = true;
        var options = {};

        $cordovaFileTransfer.upload(server, imageurl, options, trustHosts)
            .then(function (result) {
                var data = JSON.parse(result.response)
                if (data.Successful) {
                    var findImage = _.find($scope.currentAudit.Images, function(i) {
                        return i.url === image.url
                    })
                    findImage.targetUrl = data.Data;
                    findImage.isSnyc = true;
                    LocalData.syncAuditImage($scope.currentAudit.Id, $scope.currentAudit.Images)
                    fn();
                }
                else {
                    fn('error')
                }
        }, function (err) {
            alert(JSON.stringify(err))
            alert('error here')
            fn('error');
        }, function (progress) {
        });
    }

    $scope.stop = function() {
        $scope.isStart = false;
        // $state.go('tab.dash')
    }
})

.controller('TabCtrl', function($scope, $state, LocalData, AlertService) {
    $scope.sync = function() {
        $state.go("sync")
    }
    $scope.add = function() {
        var index = _.findIndex(LocalData.AuditDataList, function(audit) {
            return audit.IsComplete === 1
        })
        if (index === -1) {
            $state.go('audit', {auditId: 0})
        }
        else {
            AlertService.ConfirmAudit("您有未完成的巡检，请选择？", "用户确认",
                function() {
                    $state.go('audit', {auditId: LocalData.AuditDataList[index].Id})
                }, function() {
                    LocalData.dropAudit(LocalData.AuditDataList[index])
                    $state.go('audit', {auditId: 0})
                })
        }
    }
})

.controller('SigninCtrl', function($scope, $state, DataService, Auth, AlertService) {
    $scope.user = {
        username: "ship2",
        pwd: "123456"
    };

    $scope.isshow = true;

    // if(Auth.has()){
    //     return $state.go('tab.dash');
    // }

    var keys = Object.keys(localStorage)
    if (keys.length === 0) {
        $scope.isshow = false;
    }

    $scope.signin = function() {
        if (!$scope.user.username || !$scope.user.pwd) {
            return AlertService.Alert("请填写用户名和密码")
        }

        DataService.login($scope.user.username, $scope.user.pwd)
            .then(function(data) {
                AlertService.Alert('登录成功');
                Auth.set(data)
                $state.go('tab.dash');
            })
            .catch(function(err) {
               AlertService.Alert(err)
            })
    }

    $scope.signout = function() {
        navigator.app.exitApp();
    }
})

.controller('UsersCtrl', function($scope, $state, AlertService) {
    $scope.users = []

    var keys = Object.keys(localStorage),
        i = keys.length;

    while ( i-- ) {
        if (keys[i] === 'userid') break;
        var user = JSON.parse(localStorage.getItem(keys[i]))
        if (user.Loaded) {
            $scope.users.push({
                userid: keys[i],
                user: user.User
            });
        }
    }

    $scope.selectUserId = null;
    if ($scope.users.length > 0)
        $scope.selectUserId = $scope.users[0].userid;

    $scope.change = function() {
        console.log($scope.selectUserId)
        AlertService.Confirm("确定切换用户吗？", "用户提示", function() {
            localStorage.setItem("userid", $scope.selectUserId);
            $state.go("tab.dash")
        })
    }
})

.controller('SettingCtrl', function($scope, $state, Auth, LocalData, AlertService) {
    $scope.datestr = moment().format("YYYY-MM-DD")
    $scope.user = LocalData.User;

    $scope.sync = function() {
        LocalData.loadService()
    }
    $scope.signout = function() {
        ///20161011 guanvee 改成切换用户的方式
        $state.go('signin')
        // AlertService.Confirm("确定退出吗？", "用户提示", function() {
        //     Auth.empty()
        //     $state.go('signin')
        // })
    }
});
