class BaseModel {
  constructor(attributes = {}) {
    Object.assign(this, attributes);
  }
}

module.exports = {
  BaseModel
};
