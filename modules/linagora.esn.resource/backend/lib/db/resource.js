module.exports = dependencies => {
  const mongoose = dependencies('db').mongo.mongoose;
  const ObjectId = mongoose.Schema.ObjectId;

  const ResourceSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    // "admin#directory#resources#calendars#CalendarResource"
    type: {type: String, required: true},
    deleted: {type: Boolean, default: false},
    domain: {type: ObjectId, ref: 'Domain', required: true},
    creator: {type: ObjectId, ref: 'User', required: true},
    icon: {type: String},
    administrators: [
      {
        objectType: {type: String, required: true},
        id: {type: mongoose.Schema.Types.Mixed, required: true}
      }
    ],
    timestamps: {
      creation: {type: Date, default: Date.now},
      updatedAt: {type: Date}
    }
  });

  return mongoose.model('Resource', ResourceSchema);
};
