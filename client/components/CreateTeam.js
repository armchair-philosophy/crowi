import React from 'react'
import PropTypes from 'prop-types'

import { Modal } from 'react-bootstrap'

export default class CreateTeam extends React.Component {
  construct (props) {
    super(props)

    this.onModalCloseClicked = this.props.onModalCloseClicked
    this.crowi = this.props.crowi

    
  }

  render() {
    return (
      <Modal>
        <div>Hoge</div>
      </Modal>
    )
  }
}

CreateTeam.PropTypes = {
  crowi: PropTypes.object.isRequired,
  onModalCloseClicked: PropTypes.func.isRequired,
}
