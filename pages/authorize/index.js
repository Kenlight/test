const WXAPI = require('../../wxapi/main')
var app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    registered: false,
    loginInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    const that = this;
    wx.login({
      success: function(res) {
        WXAPI.login(res.code).then(function(res) {
          if (res.code == 0) {
            that.setData({
              registered: true,
              loginInfo: res.data
            });
          }
        })
      }
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    app.navigateToLogin = true;
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  },
  getPhoneNumber(e) {
    if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
      wx.showModal({
        title: '提示',
        content: '无法获取手机号码:' + e.detail.errMsg,
        showCancel: false
      })
      return;
    }
    var loginInfo = this.data.loginInfo;
    WXAPI.bindMobile({
      token: loginInfo.token,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv
    }).then(function (res) {
      if (res.code == 0) {
        wx.setStorageSync('token', loginInfo.token)
        wx.setStorageSync('uid', loginInfo.uid)
        wx.setStorageSync('userid', loginInfo.info.base.userid)
        wx.setStorageSync('userInfo', {nickName: loginInfo.info.base.nickname, avatarUrl: loginInfo.info.base.avatar})
        wx.showToast({
          title: '快捷登录成功',
          icon: 'success',
          duration: 2000
        })
        // wx.reLaunch({
        //   url: "/pages/my/index"
        // })
        wx.navigateBack()
      } else {
        wx.showModal({
          title: '提示',
          content: '快捷登录失败',
          showCancel: false
        })
      }
    })
  },
  bindGetUserInfo: function(e) {
    if (!e.detail.userInfo) {
      return;
    }
    if (app.globalData.isConnected) {
      // wx.setStorageSync('userInfo', e.detail.userInfo)
      // this.login();
      this.registerUser()
    } else {
      wx.showToast({
        title: '当前无网络',
        icon: 'none',
      })
    }
  },
  bindCancel: function() {
    wx.navigateBack();
  },
  registerUser: function() {
    let that = this;
    wx.login({
      success: function(res) {
        let code = res.code; // 微信登录接口返回的 code 参数，下面注册接口需要用到
        wx.getUserInfo({
          success: function(res) {
            wx.showLoading();
            let iv = res.iv;
            let encryptedData = res.encryptedData;
            let referrer = '' // 推荐人
            let referrer_storge = wx.getStorageSync('referrer');
            if (referrer_storge) {
              referrer = referrer_storge;
            }
            // 下面开始调用注册接口
            WXAPI.register({
              code: code,
              encryptedData: encryptedData,
              iv: iv,
              referrer: referrer
            }).then(function(res) {
              if (res.code == 0) {
                wx.login({
                  success: function(val) {
                    WXAPI.login(val.code).then(function(res) {
                      if (res.code == 0) {
                        that.setData({
                          registered: true,
                          loginInfo: val.data
                        });
                        var loginInfo = res.data;
                        WXAPI.bindMobile({
                          token: loginInfo.token,
                          encryptedData: encryptedData,
                          iv: iv
                        }).then(function (res) {
                          wx.hideLoading();
                          if (res.code == 0) {
                            wx.setStorageSync('token', loginInfo.token)
                            wx.setStorageSync('uid', loginInfo.uid)
                            wx.setStorageSync('userid', loginInfo.info.base.userid)
                            wx.setStorageSync('userInfo', {nickName: loginInfo.info.base.nickname, avatarUrl: loginInfo.info.base.avatar})
                            wx.showToast({
                              title: '登录成功',
                              icon: 'success',
                              duration: 2000
                            })
                            wx.navigateBack()
                            // wx.reLaunch({
                            //   url: "/pages/my/index"
                            // })
                          } else {
                            wx.showModal({
                              title: '提示',
                              content: '登录失败',
                              showCancel: false
                            })
                          }
                        })
                      }
                    })
                  }
                })
              }
              else {
                wx.hideLoading();
                wx.showModal({
                  title: '提示',
                  content: '注册失败',
                  showCancel: false
                })
              }
              // wx.hideLoading();
              // that.login();
            })
              .catch(err => {
                wx.showModal({
                  title: '提示',
                  content: err,
                  showCancel: false
                })
              })
          }
        })
      }
    })
  }
})
