let resp = {
    code: null,
    msg: null,
    data: null,
  
    /**
     * 
     * @param {string} msg 
     * @param {any} data 
     * @returns 
     */
    Ok: (msg,data)=>{
      this.code = 200;
      this.msg = msg!=undefined? msg : 'success';
      this.data = data!=undefined? data : null;
      return this;
    },

    /**
     * 
     * @param {string} msg 
     * @param {any} data 
     * @returns 
     */
    fail: (msg,data)=>{
        this.code = 400;
        this.msg = msg!=undefined? msg : 'fail';
        this.data = data!=undefined? data : null;
        return this;
    },

    /**
     * @type {method}
     * @param {string} msg 
     * @returns 
     */
    Bad: (msg)=>{
        this.code = 500;
        this.msg = msg!=undefined? msg : 'Bad Request';
        this.data = data!=undefined? data : null;
        return this;
    }
}

module.exports = resp;