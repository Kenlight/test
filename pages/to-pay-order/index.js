const app = getApp()
const WXAPI = require('../../wxapi/main')
const TOOLS = require('../../utils/tools.js')

Page({
  data: {
    totalScoreToPay: 0,
    goodsList: [],
    orderLines: [],
    isNeedLogistics: 0, // 是否需要物流信息
    allGoodsPrice: 0,
    taxPrice: 0,
    yunPrice: 0,
    allGoodsAndYunPrice: 0,
    goodsJsonStr: "",
    orderType: "", //订单类型，购物车下单或立即支付下单，默认是购物车，
    pingtuanOpenId: undefined, //拼团的话记录团号
    remark: '',

    hasNoCoupons: true,
    scoreDeduct: 0,
    coupons: [],
    youhuijine: 0, //优惠券金额
    curCoupon: null, // 当前选择使用的优惠券
    curCouponShowText: '选择使用优惠券',
    curDiscount: null,
    allowSelfCollection: '0', // 是否允许到店自提
    peisongType: 'kd' // 配送方式 kd,zq 分别表示快递/到店自取
  },
  onShow: function () {
    let allowSelfCollection = wx.getStorageSync('ALLOW_SELF_COLLECTION')
    if (!allowSelfCollection || allowSelfCollection != '1') {
      allowSelfCollection = '0'
      this.data.peisongType = 'kd'
    }
    const that = this;
    let shopList = [];
    //立即购买下单
    if ("buyNow" == that.data.orderType) {
      var buyNowInfoMem = wx.getStorageSync('buyNowInfo');
      that.data.kjId = buyNowInfoMem.kjId;
      if (buyNowInfoMem && buyNowInfoMem.shopList) {
        shopList = buyNowInfoMem.shopList
      }
    } else {
      //购物车下单
      var shopCarInfoMem = wx.getStorageSync('shopCarInfo');
      that.data.kjId = shopCarInfoMem.kjId;
      if (shopCarInfoMem && shopCarInfoMem.shopList) {
        // shopList = shopCarInfoMem.shopList
        shopList = shopCarInfoMem.shopList.filter(entity => {
          return entity.active;
        });
      }
    }
    that.setData({
      goodsList: shopList,
      allowSelfCollection: allowSelfCollection,
      peisongType: that.data.peisongType
    });
    that.initShippingAddress();
  },

  onLoad: function (e) {
    let _data = {
      isNeedLogistics: 1
    }
    if (e.orderType) {
      _data.orderType = e.orderType
    }
    if (e.pingtuanOpenId) {
      _data.pingtuanOpenId = e.pingtuanOpenId
    }
    this.setData(_data);
  },

  getDistrictId: function (obj, aaa) {
    if (!obj) {
      return "";
    }
    if (!aaa) {
      return "";
    }
    return aaa;
  },

  remarkChange(e) {
    this.data.remark = e.detail.value
  },
  goCreateOrder() {
    wx.requestSubscribeMessage({
      tmplIds: wx.getStorageSync('msgtpl_id_list'),
      success(res) {

      },
      fail(e) {
        console.error(e)
      },
      complete: (e) => {
        this.createOrder(true)
      },
    })
  },
  createOrder: function (e) {
    var that = this;
    var loginToken = wx.getStorageSync('token') // 用户登录 token
    var remark = ""; // 备注信息
    if (e) {
      remark = this.data.remark; // 备注信息
    }

    let postData = {
      token: loginToken,
      goodsJsonStr: that.data.goodsJsonStr,
      remark: remark,
      peisongType: that.data.peisongType
    };
    if (that.data.kjId) {
      postData.kjid = that.data.kjId
    }
    if (that.data.pingtuanOpenId) {
      postData.pingtuanOpenId = that.data.pingtuanOpenId
    }
    if (that.data.isNeedLogistics > 0 && postData.peisongType == 'kd') {
      if (!that.data.curAddressData) {
        wx.hideLoading();
        wx.showToast({
          title: '请设置收货地址',
          icon: 'none'
        })
        return;
      }
      if (postData.peisongType == 'kd') {
        postData.provinceId = that.data.curAddressData.provinceId;
        postData.cityId = that.data.curAddressData.cityId;
        if (that.data.curAddressData.districtId) {
          postData.districtId = that.data.curAddressData.districtId;
        }
        postData.address = that.data.curAddressData.address;
        postData.linkMan = that.data.curAddressData.linkMan;
        postData.mobile = that.data.curAddressData.mobile;
        postData.code = that.data.curAddressData.code;
      }      
    }
    if (that.data.curCoupon) {
      postData.couponId = that.data.curCoupon.id;
    }
    if (!e) {
      postData.calculate = "true";
    }

    wx.showLoading({
      mask: true,
      title: '提交中...'
    });
    WXAPI.orderCreate(postData).then(function (res) {
      wx.hideLoading();
      if (res.code != 0) {
        wx.showModal({
          title: '错误',
          content: res.msg,
          showCancel: false
        })
        return;
      }

      if (e && "buyNow" != that.data.orderType) {
        // 清空购物车数据
        let list = wx.getStorageSync('shopCarInfo').shopList;
        list = list.filter(function (curGoods) {
          return !curGoods.active;
        });
        var tempNumber = 0;
        for (var i = 0; i < list.length; i++) {
          tempNumber = tempNumber + list[i].number
        }
        wx.setStorage({
          key: "shopCarInfo",
          data: { 'shopList': list, 'shopNum': tempNumber},
          success: function (res) {
            TOOLS.showTabBarBadge();
          }
        })
      }
      if (!e) {
        that.setData({
          totalScoreToPay: res.data.score,
          isNeedLogistics: res.data.isNeedLogistics,
          allGoodsPrice: res.data.amountTotle,
          allGoodsAndYunPrice: res.data.amountLogistics + res.data.amountTotle + (res.data.amountTax || 0),
          orderLines: res.data.orderLines,
          curDiscount: res.data.discounts,
          taxPrice: res.data.amountTax || 0,
          scoreDeduct: res.data.extra.scoreDeduct || 0,
          yunPrice: res.data.amountLogistics
        });
        that.getMyCoupons();
        var extra = res.data.extra;
        if (extra && extra.tips) {
          wx.showModal({
            title: '提示',
            content: extra.tips,
            showCancel: false
          })
        } 
        return;
      }
      // 下单成功，跳转到订单管理界面
      wx.redirectTo({
        url: "/pages/order-list/index"
      });
    })
  },
  initShippingAddress: function () {
    var that = this;
    WXAPI.defaultAddress(wx.getStorageSync('token')).then(function (res) {
      if (res.code == 0) {
        that.setData({
          curAddressData: res.data
        });
      } else {
        that.setData({
          curAddressData: null
        });
      }
      that.processYunfei();
    })
  },
  processYunfei: function () {
    var that = this;
    var goodsList = this.data.goodsList;
    var goodsJsonStr = "[";
    var isNeedLogistics = 0;
    var allGoodsPrice = 0;


    let inviter_id = 0;
    let inviter_id_storge = wx.getStorageSync('referrer');
    if (inviter_id_storge) {
      inviter_id = inviter_id_storge;
    }
    for (let i = 0; i < goodsList.length; i++) {
      let carShopBean = goodsList[i];
      if (carShopBean.logistics) {
        isNeedLogistics = 1;
      }
      allGoodsPrice += carShopBean.price * carShopBean.number;

      var goodsJsonStrTmp = '';
      if (i > 0) {
        goodsJsonStrTmp = ",";
      }

      goodsJsonStrTmp += '{"goodsId":' + carShopBean.goodsId + ',"number":' + carShopBean.number + ',"propertyChildIds":"' + carShopBean.propertyChildIds + '","logisticsType":0, "inviter_id":' + inviter_id + '}';
      goodsJsonStr += goodsJsonStrTmp;


    }
    goodsJsonStr += "]";
    //console.log(goodsJsonStr);
    that.setData({
      isNeedLogistics: isNeedLogistics,
      goodsJsonStr: goodsJsonStr
    });
    that.createOrder();
  },
  addAddress: function () {
    wx.navigateTo({
      url: "/pages/address-add/index"
    })
  },
  selectAddress: function () {
    wx.navigateTo({
      url: "/pages/select-address/index"
    })
  },
  async getMyCoupons() {
    const res = await WXAPI.myCoupons({
      token: wx.getStorageSync('token'),
      status: 0
    })
    if (res.code == 0) {
      var coupons = res.data.filter(entity => {
        return entity.moneyHreshold <= this.data.allGoodsAndYunPrice;
      })
      if (coupons.length > 0) {
        coupons.forEach(ele => {
          ele.nameExt = ele.name + ' [满' + ele.moneyHreshold + '元可减' + ele.money + '元]'
        })
        this.setData({
          hasNoCoupons: false,
          coupons: coupons
        });
      }
    }
  },
  bindChangeCoupon: function (e) {
    if (this.data.curDiscount) {
      wx.showModal({
        title: '提示',
        content: '已经使用了满减优惠，不能叠加使用优惠券',
        showCancel: false
      })
      this.setData({
        curCouponShowText: '选择使用优惠券'
      });
      return
    }
    const selIndex = e.detail.value;
    this.setData({
      youhuijine: this.data.coupons[selIndex].money,
      curCoupon: this.data.coupons[selIndex],
      curCouponShowText: this.data.coupons[selIndex].nameExt
    });
  },
  radioChange (e) {
    this.setData({
      peisongType: e.detail.value
    })
    this.processYunfei();
  }
})
