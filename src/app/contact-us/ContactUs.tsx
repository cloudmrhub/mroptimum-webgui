import React, {useState} from 'react';
import './ContactUs.scss';
import {Button} from "@mui/material";

const ContactUs = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('MR Optimum');
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(null);

    const handleSubmit = (event:any) => {
        event.preventDefault();
        // Add your form submission logic here
    };

    return (
        <div className="m-5" style={{justifyContent:'center',display:'flex'}}>
            <div className="col-md-6">
                <div className="card">
                    <div className="card-header p-2">Contact Us</div>
                    <div className="card-body m-5">
                        {success ? (
                            <div className="alert alert-success" role="alert">
                                <strong>Success</strong> {success}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="form-group row mb-2">
                                    <label
                                        htmlFor="name"
                                        className="col-md-3 col-form-label text-md-end"
                                    >
                                        Name
                                    </label>
                                    <div className="col-md-7">
                                        <input
                                            id="name"
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            required
                                            autoComplete="name"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="form-group row mb-2">
                                    <label
                                        htmlFor="email"
                                        className="col-md-3 col-form-label text-md-end"
                                    >
                                        Email
                                    </label>
                                    <div className="col-md-7">
                                        <input
                                            id="email"
                                            type="email"
                                            className="form-control"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            required
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="form-group row mb-2">
                                    <label
                                        htmlFor="subject"
                                        className="col-md-3 col-form-label text-md-end"
                                    >
                                        Subject
                                    </label>
                                    <div className="col-md-7">
                                        <input
                                            id="subject"
                                            type="text"
                                            className="form-control"
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value)}
                                            required
                                            autoComplete="subject"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="form-group row mb-2">
                                    <label
                                        htmlFor="message"
                                        className="col-md-3 col-form-label text-md-end"
                                    >
                                        Message
                                    </label>
                                    <div className="col-md-7">
                                              <textarea
                                                  id="message"
                                                  className="form-control"
                                                  value={message}
                                                  onChange={(event) => setMessage(event.target.value)}
                                                  rows={8}
                                                  placeholder="Please enter your message here"
                                              />
                                    </div>
                                </div>
                                <div className="form-group row mb-2">
                                    <div className="col-md-10">
                                        <Button variant={'contained'} color={'info'} style={{float:'right'}}>
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
