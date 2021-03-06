import React from 'react';
import { connect } from 'react-redux';
import reactStamp from 'react-stamp';
import { resetErrorMessage } from 'actions/github.act';
import Explore from './explore.cont.jsx';
import ErrorMessage from './components/error.comp.jsx';


const {
  string, node, func
} = React.PropTypes;


const GithubPage = reactStamp(React)
  .compose({
    displayName: 'GithubPage',

    propTypes: {
      errorMessage: string,
      resetErrorMessage: func.isRequired,
      children: node
    },

    handleResetError() {
      this.props.resetErrorMessage();
    },

    render() {
      const { children, errorMessage } = this.props;

      return (
        <div className="container">
          <div className="row">
            <div className="col-sm-6 col-sm-offset-3">
              <Explore />
              <hr />
              {this._renderError()}
              {children}
            </div>
          </div>
        </div>
      )
    },

    _renderError() {
      const { errorMessage } = this.props;
      if (!errorMessage) return null;
      return (
        <ErrorMessage
          message={errorMessage}
          onClick={() => this.handleResetError() }/>
      )
    }
  });


function mapStateToProps(state, ownProps) {
  const { github: { errorMessage } } = state;
  return {
    errorMessage
  }
}


export default connect(mapStateToProps, {
  resetErrorMessage
})(GithubPage);
