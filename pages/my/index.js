const app = getApp()
const CONFIG = require('../../config.js')
const WXAPI = require('../../wxapi/main')
const TOOLS = require('../../utils/tools.js')

Page({
	data: {
    balance:0.00,
    freeze:0,
    score:0,
    score_sign_continuous:0,
    couponOpen: false,
    rechargeOpen: false, // 是否开启充值[预存]功能
    badges: [0, 0, 0, 0, 0],
  },
	onLoad() {
    let rechargeOpen = wx.getStorageSync('RECHARGE_OPEN')
    if (rechargeOpen && rechargeOpen == "1") {
      rechargeOpen = true
    } else {
      rechargeOpen = false
    }
    let couponOpen = wx.getStorageSync('coupon_open')
    if (couponOpen && couponOpen == '1') {
      couponOpen = true
    } else {
      couponOpen = false
    }
    this.setData({
      couponOpen: couponOpen,
      rechargeOpen: rechargeOpen
    })
	},
  onShow() {
    let that = this;
    let userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      app.goLoginPageTimeOut()
    } else {
      that.setData({
        userInfo: userInfo,
        version: CONFIG.version,
        vipLevel: app.globalData.vipLevel
      })
    }
    this.getUserApiInfo();
    this.getUserAmount();
    this.getOrderStatistics()
    // 获取购物车数据，显示TabBarBadge
    TOOLS.showTabBarBadge();
  },
  // 获取订单数量信息
  getOrderStatistics: function() {
    var that = this;
    WXAPI.orderStatistics(wx.getStorageSync('token')).then(res => {
      if (res.code == 0) {
        const badges = this.data.badges;
        badges[0] = res.data.count_id_no_pay // 待付款
        badges[1] = res.data.count_id_no_transfer // 待发货
        badges[2] = res.data.count_id_no_confirm // 待收货
        badges[3] = res.data.count_id_no_reputation // 待评价
        // badges[4] = res.data.count_id_success // 已完成
        this.setData({
          badges
        })
      }
    })
  },
  aboutUs : function () {
    wx.showModal({
      title: '关于我们',
      content: `本系统由广州菱致计算机软件有限公司研发，欢迎垂询，\r\n刘小姐：138 0886 6132`,
      showCancel:false
    })
  },
  getPhoneNumber: function(e) {
    if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
      wx.showModal({
        title: '提示',
        content: '无法获取手机号码:' + e.detail.errMsg,
        showCancel: false
      })
      return;
    }
    var that = this;
    WXAPI.bindMobile({
      token: wx.getStorageSync('token'),
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv
    }).then(function (res) {
      if (res.code === 10002) {
        app.goLoginPageTimeOut()
        return
      }
      if (res.code == 0) {
        wx.showToast({
          title: '绑定成功',
          icon: 'success',
          duration: 2000
        })
        that.getUserApiInfo();
      } else {
        wx.showModal({
          title: '提示',
          content: '绑定失败',
          showCancel: false
        })
      }
    })
  },
  getUserApiInfo: function () {
    var that = this;
    WXAPI.userDetail(wx.getStorageSync('token')).then(function (res) {
      if (res.code == 0) {
        let _data = {}
        _data.apiUserInfoMap = res.data
        if (res.data.base.mobile) {
          _data.userMobile = res.data.base.mobile
        }
        if (res.data.base.username) {
          _data.username = res.data.base.username;
          _data.nickname = res.data.base.nickname;
        }
        that.setData(_data);
      }
    })
  },
  getUserAmount: function () {
    var that = this;
    WXAPI.userAmount(wx.getStorageSync('token')).then(function (res) {
      if (res.code == 0) {
        that.setData({
          balance: res.data.balance.toFixed(2),
          freeze: res.data.freeze.toFixed(2),
          score: res.data.score
        });
      }
    })
  },
  relogin:function(){
    app.navigateToLogin = false;
    app.goLoginPageTimeOut()
  },
  bingLogin: function () {
    const token = wx.getStorageSync('token');
    if (token){
      wx.navigateTo({
        url: "/pages/bind-login/index"
      })
    }else{
      this.relogin();
    }
  },
  goAsset: function () {
    wx.navigateTo({
      url: "/pages/asset/index"
    })
  },
  goScore: function () {
    wx.navigateTo({
      url: "/pages/score/index"
    })
  },
  goOrder: function (e) {
    wx.navigateTo({
      url: "/pages/order-list/index?type=" + e.currentTarget.dataset.type
    })
  }
})
