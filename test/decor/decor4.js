module.exports = () => {
  return {
    listener: emitter => {
      emitter.on("config-composed", (data, next) => {
        next(new Error("test listner error"));
      });
    }
  };
};
