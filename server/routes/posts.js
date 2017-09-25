'use strict';

const config = require('../config.json');
const pino = require('pino')();
const middleware = require('../middleware/index');
const postsModel = require('../models/posts');
const filesModel = require('../models/files');
const filesPath = config.files.path;
const mimeTypes = config.posts.mimeTypes;

function getOne(req, res) {
  postsModel.getOne(req.params.id)
    .then(function (data) {
        pino.info(data);
        res.json(data);
      },
      function (error) {
        pino.error(error);
        res.send(404);
      });
}

function getOrderList(req, res) {
  postsModel.getOrderList(req.query.page, req.query.limit)
    .then(function (data) {
        if (data.length < 1) {
          res.send(404);
          pino.error(data);
          return;
        }

        pino.info(data);
        res.json(data);
      },
      function (error) {
        pino.error(error);
        res.send(404);
      }
    );
}

async function create(req, res) {
  try {
    const data = {
      heading: req.body.heading,
      text: req.body.text,
      file: req.files.file
    };

    const fileId = await filesModel.upload({
      file: data.file,
      path: filesPath,
      mimeTypes: mimeTypes,
    });

    const post = await postsModel.create({
      heading: data.heading,
      text: data.text,
      file: fileId[0]
    });

    pino.info(post);
    res.json(post);
  } catch (error) {
    pino.error(error);
    res.json('Posts create error: data not available');
  }
}

async function update(req, res) {
  if (!req.body && !req.files) {
    res.json('Posts put error: data not found');
    pino.error('Posts put error: data not found');
    return;
  }
  let fileId;
  const file = req.files ? req.files.file : null;

  if (file) {
    try {
      fileId = await await filesModel.upload({
        file: file,
        path: filesPath,
        mimeTypes: mimeTypes,
      });

      fileId = fileId[0];
    } catch (error) {
      pino.error(error);
      res.json('Posts put error: file upload problem');
    }
  }

  const data = {
    heading: req.body.heading || null,
    text: req.body.text || null,
    file: fileId || req.body.file,
    id: req.params.id || null
  };

  try {
    const post = await postsModel.update(data);
    pino.info(post);
    res.json(post);
  } catch (error) {
    pino.error(error);
    res.json('Posts put error: ' + error);
  }
}

function remove(req, res) {
  postsModel.remove(req.params.id).then(function (data) {
      pino.info(data);
      res.json(data);
    },
    function (error) {
      pino.error(error);
      res.json('Posts remove error: ' + error);
    }
  );
}

module.exports = function (router) {
  router.route('/api/posts/:id')
    .get(middleware.auth([1, 2]), function (req, res) {
      getOne(req, res);
    })
    .put(middleware.auth(1), function (req, res) {
      update(req, res);
    })
    .delete(middleware.auth(1), function (req, res) {
      remove(req, res);
    });

  router.route('/api/posts')
    .get(function (req, res) {
      getOrderList(req, res);
    })
    .post(middleware.auth(1), function (req, res) {
      create(req, res);
    })
};