"use strict"
let N3 = require("n3")


class Policy {
    constructor(policyTriplestore) {
        this.uid = this._retrieveUid(policyTriplestore)
        this.profile = this._retrieveProfile(policyTriplestore)
    }
    _retrieveUid(policyTriplestore) {
        let _uid = ""
        let selectedQuads = policyTriplestore.getTriplesByIRI(null, "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>", null, null)
        if (selectedQuads[0]) {
            _uid = selectedQuads[0].subject
        }
        else {
            _uid = "UNKNOWN"
        }
        return _uid
    }
    _retrieveProfile (policyTriplestore) {
        let _profile = ""
        let selectedQuads = policyTriplestore.getTriplesByIRI(this.uri, "<http://www.w3.org/ns/odrl/2/profile>", null, null)
        if (selectedQuads[0]) {
            _profile = selectedQuads[0].subject
        }
        else {
            _profile = "UNKNOWN"
        }
        return _profile
    }


}
exports.Policy = Policy
