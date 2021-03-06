import { Schema, arrayOf, normalize } from 'normalizr';
import { camelizeKeys } from 'humps';
import 'isomorphic-fetch';
import R from 'ramda';


// Extracts the next page URL from Github API response
function getNextPageUrl(response) {
  const link = response.headers.get('link');
  if (!link) return null;

  const nextLink = link.split(',').find(s => s.indexOf('rel="next"') > -1);
  if (!nextLink) return null;

  return nextLink.split(';')[0].slice(1, -1);
}


const API_ROOT = 'https://api.github.com/';

// Fetches an API response and normalize the result JSON according to schema.
// This makes every API response have the same shape, regardless of how nested it was.
function callApi(endpoint, schema) {
  const fullUrl = (endpoint.indexOf(API_ROOT) === -1) ? API_ROOT + endpoint : endpoint;

  return fetch(fullUrl)
    .then(response =>
      response.json()
        .then(json => ({ json, response }) )
    )
    .then(({ json, response }) => {
      if (!response.ok) {
        return Promise.reject(json);
      }

      const camelizedJson = camelizeKeys(json);
      const nextPageUrl = getNextPageUrl(response);
      return R.merge(normalize(camelizedJson, schema), { nextPageUrl });
    });
}

// We use this Normalizr schemas to transform API responses from a nested form
// to a flat form where repos and users are placed in `entities`, and nested
// JSON objects are replaced with their IDs. This is very convenient for
// consumption by reducers, because we can easily build a normalized tree
// and keep it updated as we fetch more data.

// Read more about Normalizr: https://github.com/gaearon/normalizr

const userSchema = new Schema('users', {
  idAttribute: 'login'
});

const repoSchema = new Schema('repos', {
  idAttribute: 'fullName'
});

repoSchema.define({
  owner: userSchema
});

export const Schemas = {
  USER: userSchema,
  USER_ARRAY: arrayOf(userSchema),
  REPO: repoSchema,
  REPO_ARRAY: arrayOf(repoSchema)
};

// Action key that carries API call info interpreted by this Redux middleware
// note: symbol is only used in action call to identify this middleware
//       Symbol are not supported by IE, thus we prefer omit it
// export const CALL_API = Symbol('CALL API');
export const CALL_API = 'MY-CALL_API-CONST';

// A Redux middleware that interprets actions with CALL_API info specified.
// Performs the call and promises when such actions are dispatched.
export default store => next => action => {
  const callAPI = action[CALL_API];
  // if not a call api resume next action
  if (typeof callAPI === 'undefined') {
    return next(action);
  }

  // call api check
  let { endpoint } = callAPI;
  const { schema, types } = callAPI;

  // handle endpoint as a function
  if (typeof endpoint === 'function') {
    endpoint = endpoint(store.getState());
  }

  if (typeof endpoint !== 'string') {
    throw new Error('Specify a string enpoint URL.');
  }

  if (!schema) {
    throw new Error('Specify one of the exported Schemas.');
  }

  if (!Array.isArray(types) || types.length !== 3) {
    throw new Error('Expected an array of three action types.');
  }

  if (!types.every(type => typeof type === 'string')) {
    throw new Error('Expected action types to be strings.');
  }

  // is it really necessary??? I don't understand why - skip it for instance
  // clearer now: some actions like `loadStargazers` have extra info
  function actionWith(data) {
    let finalAction = R.merge(action, data);
    delete finalAction[CALL_API];
    return finalAction;
  }

  const [ requestType, successType, failureType ] = types;

  next(actionWith({ type: requestType }));

  return callApi(endpoint, schema)
    .then( response => next(actionWith({
      response,
      type: successType
    })))
    .catch( error => next(actionWith({
      type: failureType,
      error: error.message || 'Something bad happened'
    })));
};
