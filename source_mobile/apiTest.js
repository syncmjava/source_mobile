//var domain="http://pms.lewei50.com";
var domain="http://localhost:19301";

var request = require('supertest')(domain);
 
//{"Data":{"UserName":"guanvee","FullName":"管伟","Token":"6579A4128096E447D250A4D233F82F68826F6BB1","ExpireDate":"2017-09-19T14:25:00"},"Successful":true,"Message":null}
describe('用户登陆', function() {
    it('密码正确返回true.', function(done) {
        request.get('/api/v1/user/login?username=guanvee&pwd=123456')
            .expect(function(res){
                if(res.body.Successful==false) throw new Error("返回有问题");;
            })
            .end(done);
    });
    it('密码错误返回false', function(done) {
        request.get('/api/v1/user/login?username=guanvee&pwd=xxxx')
            .expect(function(res){
                if(res.body.Successful==true) throw new Error("返回有问题");;
            })
            .end(done);
    });
});

//{“Data”:{"Info":{“ShipName”:"渤海一号","ShipAuditTitle":”常规巡检”,”ShipAuditDescription”:"按指定时间间隔进行的巡检处理，对船舶养护非常重要","Cycle":1200},”PersonList”:[{"EmployId":”16a83409-b893-47dd-919f-9ad27a8a970a”,”Name”:"管伟"}],"StepSet":[{“Id”:"850e0103-861b-4f45-aa62-db7833a440cb","Idx":1,”No”:"01","Title":”检查机舱”,”Place”:"机舱","Description":”检查机舱”,”QRContent”:"1266735","ExceptionList":[{“No”:"01","Idx":1,”Title”:"温度过高","Description":”温度超过39度”},{“No”:"02","Idx":2,”Title”:"声音异常","Description":”杂音”}]},{“Id”:"193e537c-37f5-40ea-b702-d288b9b1302a","Idx":2,”No”:"02","Title":”检查发动机”,”Place”:"发动机舱","Description":”检查发动机”,”QRContent”:"323532","ExceptionList":[]}]},”Successful”:true,"Message":null}
describe('读取巡检设置', function() {
    it('token正确返回true.', function(done) {
        request.get('/api/v1/shipaudit/getshipsetting?token=6579A4128096E447D250A4D233F82F68826F6BB1')
            .expect(function(res){
                if(res.body.Successful==false) throw new Error("返回有问题");;
            })
            .end(done);
    });
    it('token错误返回false.', function(done) {
        request.get('/api/v1/shipaudit/getshipsetting?token=xxx')
            .expect(function(res){
                //console.log(res);
                if(res.body.Successful==true) throw new Error("返回有问题");;
            })
            .end(done);
    });
});

///{ “Data”: “0919\144602ea1.jpg”,“Successful”: true,“Message”: null}
describe('上传图片', function() {
    it('上传正确返回true', function(done) {
        request.post('/api/v1/upload/picupload')
        .attach('uploadfile', 'C:/Users/guanvee/Desktop/57e0ed7fNc02737bd.jpg')
            .expect(function(res){
                if(res.body.Successful==false) throw new Error("返回有问题");;
            })
            .end(done);
    });
     
});

describe('提交巡检数据', function() {
    this.timeout(5000);
    it('上传正确返回true', function(done) {
        request.post('/api/v1/shipaudit/CommitData?token=6579A4128096E447D250A4D233F82F68826F6BB1')
        .type('text')
        .send( 
            JSON.stringify(
            {"Id":"bfd882e3-161d-af7a-7ab1-82149f3a3c91","StartTime":"2016-09-26T08:43:34.117Z","EndTime":"2016-09-26T08:45:03.792Z","EmployeeId": "8e04d4aa-141b-4e99-911f-8568f0552b40","Result":false,"ResultMessage":"异常","StepData":[{"StepSetId":"f2cf4e15-e8cc-4823-35b9-0ac8f3bd37b8","StartTime":"2016-09-26T08:43:34.116Z","EndTime":"2016-09-26T08:44:35.177Z","IsQRSkip":true,"Result":false,"ExceptionNoStrs":"2","ImageUrl":""},{"StepSetId":"366bf086-3814-7492-7856-3834d51c0d29","StartTime":"2016-09-26T08:43:34.117Z","EndTime":"2016-09-26T08:44:38.728Z","IsQRSkip":true,"Result":true,"ExceptionNoStrs":"","ImageUrl":""},{"StepSetId":"c7f24efb-0437-ea38-da95-833d8607a15e","StartTime":"2016-09-26T08:43:34.117Z","EndTime":"2016-09-26T08:45:03.792Z","IsQRSkip":true,"Result":false,"ExceptionNoStrs":"2","ImageUrl":""}]}
            ))
        .expect(function(res){
            if(res.body.Successful==false) {
                console.log(res.body);
                throw new Error("返回有问题");
            }
        })
        .end(done);
    });
     
});