import axios from 'axios';
import store from '../store'
import Vue from 'vue'
import { getToken, setToken } from '@util/auth'
var loadingCount = 0
// 创建axios对象
const instance = axios.create({
  baseURL: process.env.BASE_API, // api 的 base_url
  timeout: 50000 // request timeout
})
// 添加请求拦截器
instance.interceptors.request.use(
  config => {
    // 在发送请求之前做某事，比如加一个loading
    loadingCount++
    // 判定请求参数中属性noload为true的http请求,视为不需要加载loading动画,
    const noload = JSON.parse(sessionStorage.getItem('noload'))
    !noload && Vue.prototype.$mloading.show()
    sessionStorage.removeItem('noload')
    getToken() && (config.headers['Authorization'] = getToken())
    // showLoading.loading()
    // 让每个请求携带token-- ['X-Token']为自定义key 请根据实际情况自行修改
    // config.headers['Authorization'] = getToken()
    return config;
  },
  error => {
    loadingCount--
    loadingCount === 0 && Vue.prototype.$mloading.hide()
    // 请求错误时做些事
    return Promise.reject(error.response);
  }
);

// 添加一个响应拦截器
instance.interceptors.response.use(
  response => {
    // 在拿到请求后, 去除loading状态
    loadingCount--
    loadingCount === 0 && Vue.prototype.$mloading.hide()
    // 1.成功
    return Promise.resolve(response);
  },
  async error => {
    loadingCount--
    loadingCount === 0 && Vue.prototype.$mloading.hide()
    // 失败,在拿到请求后, 去除loading状态
    if (error.response.data.errorCode === '4010') {
      // 先判断是不是跳转到登录页
      if (window.location.pathname !== 'login') {
        const loginMm = store.getState()
        // 如果有RTOKEN的话, 就执行aTOKEN续命的动作
        if (loginMm.LoginInsert.RToken) {
          try {
            const data = await axios({
              method: 'post',
              url: '/api/api/v1/access_token',
              data: {
                systemId: 10,
                userCode: 'jiafu.wang'
              },
              headers: { Authorization: loginMm.LoginInsert.RToken }
            })
            const token = data.data.data
            setToken(token)
            const config = error.response.config
            config.headers.Authorization = token
            const res = await axios.request(config)
            return res
          } catch (e) {
            console.log(e)
            setToken('')
            window.location.href = '/login';
          }
        }
      } else {
        setToken('')
        window.location.href = '/login';
      }
    }
    // 400错误,正常返回错误信息
    // 500 错误. 正常返回错误信息
    // 401token过期, 无权限, 则自动刷新token续命
    return Promise.reject(error.response);
  }
);
export default instance;

const get = (url, params, config) => {
  // 在内部通过传递进来的值使用session判断本次请求是否需要loading动画
  if (params && params['noload']) {
    sessionStorage.setItem('noload', true);
    delete params['noload']
  }
  let axiosBase = {
    method: 'get',
    url: url,
    params: params
  }
  !config && (config = {})
  axiosBase = Object.assign(axiosBase, config)
  return instance(axiosBase)
}

const post = (url, params, config) => {
  // 在内部通过传递进来的值使用session判断本次请求是否需要loading动画
  if (params && params['noload']) {
    sessionStorage.setItem('noload', true);
    delete params['noload']
  }
  let axiosBase = {
    method: 'post',
    url: url,
    data: params
  }
  !config && (config = {})
  axiosBase = Object.assign(axiosBase, config)
  return instance(axiosBase)
}

export {
  get,
  post
}
