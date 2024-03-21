# Calendar Rights Management

In OpenPaaS, a calendar can be shared as a:

   * **Public calendar:** every user can access the calendar
   * **Shared calendar:** the owner can delegate its calendars to other users. 

We will use these terms in the following document:
* A SHARER is someone who gives shared right on his/her own calendar to others users 
* A SHAREE is someone who got shared rights on a calendar

## OpenPaaS Calendar
### Roles
Roles are what can be granted from a user in OpenPaaS

* Owner Rights
	* Owner : Owner of the calendar

* Shared Rights for a specific user
	* **None**
	* **Free/busy** : SHAREE knows whether Sharer is available at a specific time
	* **Read** : Can see SHARER events
	* **Read/Write** : Can see SHARER events and create/modify events
	_Note : Event Organizer is always Calendar Owner_
	* **Admin** : Have admin rights on Shared calendar
	_Note :  Event Organizer is always Calendar Owner_
	_Note :  SHAREE cannot change own shared rights_
	_Note :  SHAREE cannot grant Admin shared rights_
	
* Public Rights
	* **None**
	* **Free/Busy** : everyone knows whether SHARER is available at a specific time
	* **Read** : Can see SHARER events
	* **Read/Write** : Can see SHARER events and create/modify events
	_Note : Event Organizer is always Calendar Owner_

### Events Privacy

Events have 2 status : 

 * Public : anyone that can read event can see event in calendar access to the details of this event. Anyone that can write event can see detail of this event and modify it.
 * Private : Event is displayed in calendar view but one cannot see or modify detail except the owner.
 _Note : SHAREE Admin can access and modify private events_

## Communication with Sabre
 
It is worth mentioning the technical differences between the two implementations: a public calendar has only one instance in the database which is physically shared by all users. On the other hand, shared calendars are implemented by providing a new instance for each delegated user with the corresponding permission.

Technically speaking, Sabre leverages ACL based on the [RFC3744](https://www.ietf.org/rfc/rfc3744.txt) so as to manage both Public/Shared calendars. On the one hand, public calendars are implemented directly by a combination of ACLs. On the other hand, Shared calendars are implemented by SharedCalendar objects that extends ACLs. Indeed, Sabre uses the [CalDAV-Sharing extension](https://github.com/apple/ccs-calendarserver/blob/master/doc/Extensions/caldav-sharing.txt) to share CalDAV. Having said so, developers should always keep in mind that both type of calendars are implemented from ACLs.

To understand well how it works we need to understand how the permissions work on Sabre side. To manage permissions WebDAV uses ACL based on the [RFC3744](https://www.ietf.org/rfc/rfc3744.txt). Sabre uses the [CalDAV-Sharing extension](https://github.com/apple/ccs-calendarserver/blob/master/doc/Extensions/caldav-sharing.txt) to share CalDAV.

### Requesting calendar
When requesting calendar for an user, Sabre sends back calendar with the following information concerning rights/permissions :

 * A list of ACL lines containing:
    * the user requested and all its ACL permissions on this calendar
    * if the user has shared its calendar, SHAREE with its right on calendar
    * public permissions
 * Sharing status of the calendar (`access` property) containing :
    * `1`: the user is the owner of the calendar
    * `2`: the user has read permission on this calendar (and is not the owner)
    * `3`: the user has read/write permissions on this calendar (and is not the owner)
    * `5`: the user has admin permissions on this calendar (and is not the owner)
    * `6`: the user has free/busy permission on this calendar (and is not the owner)
 * calendar properties like color, display name...

**The ACL permissions and the sharing status give two different views on rights/permission on a calendar.**
**Sharing status show user role on a calendar and ACL show rights, but they describing the same functionality.**

### Public Calendars

These are the different rights for a public calendar. Each public calendar rights can be an aggregation of rights (ACL):

   * **Private:** none
   * **Read:** {dav:}read
   * **Write:** {dav:}read, {dav:}write

### Shared Calendars

The CalDAV-Sharing extension describes only 2 shareable rights : read, read-write. As we needed to add new roles (free-busy, administrator) for calendars, we extended the CalDAV-Sharing extension.

These are the different roles for a shared calendar:

   * **None:** {dav:}no-access
   * **Owner:** {dav:}owner
   * **Read:** {dav:}read
   * **Read-Write:** {dav:}read-write
   * *RSE Extension* **Administration:** {dav:}administration
       * A user with administration rights can read and write shared users
   * *RSE Extension* **Free/busy:** {dav:}freebusy
       * A user with free/busy can only see that the events without description, to see if the owner is free or busy.

### Annex A: How we can enhance our permission system in RSE

**How to know how the current user is the owner of the calendar?**

For now, ACL are used to check if user is Admin (ie he/she has every right on this calendar)

We can use `access = SHAREDOWNER`, as every calendar owned by a user as its access flag set to this value.

**CalendarCollectionShell API**

`isPublic`

Is this calendar a public one owned by another user

`isShared`

Is this calendar a shared calendar owned by another user who gave me rights

`isMine`

Am I the owner of the calendar

`canModifyEvents`

Can I create/modify/delete events on this calendar

```
(
    Calendar is mine
    access in SHAREE\_READ\_WRITE, SHAREE\_ADMIN
    Public right in READ\_WRITE
)
```

`canReadEvents`

Can I see events details on this calendar

```
(
    Calendar is mine
    access in SHAREE\_READ, SHAREE\_READ\_WRITE, SHAREE\_ADMIN
    Public right in READ, READ\_WRITE
)
```

`canSeeFreeBusy`

Can I see events details on this calendar

```
(
    Calendar is mine
    access in SHAREE\_FREE\_BUSY, SHAREE\_READ, SHAREE\_READ\_WRITE, SHAREE\_ADMIN
    Public right in READ, READ\_WRITE
)
```

**CalendarRightShell API**

`PublicRightConstant getPublicRight()`

Read or Write
(Used in delegation tab, when reading public right)

`Void updatePublic(newRole)`

Update public role for a calendar.
(Used in delegation tab, when changing public right)

`ShareeRightConstant getUserShareeRight(userId)`

Get ‘access’ value for userId

`[{userId, ShareeRightConstant}] getAllShareeRights(userId)`

Get all sharee rights for a calendar (all the shared rights where `access !== SHAREDOWNER`)

`updateSharee(userId, userEmail, role)`

Update sharee role for a calendar
(Used in delegation tab, when adding/updating sharee)


**Legacy code :**

`clone`

`equals`

`getUserRight(userId)`

ACL Rights management. Used only for user own calendar.
Should be refactored to isMine or isAdmin as ACL won’t be used anymore.

`removeUserRight;`

ACL Rights management. Used only for user own calendar.
Should be refactored to isMine or isAdmin as ACL won’t be used anymore.

`toDAVShareRightsUpdate`

Used to convert the sharees rights in JSON request for Sabre

`toJson`

### Annex B : REST API

#### POST /api/calendars/:calendarId/:calendarUri.json

**Request Parameters**

- share: an object that describes the new rights for specific users or the rights to remove to a user

**Request URL Parameters:**

- calendarId: the id of the calendar
- calendarUri: the uri of the calendar

**Status Codes:**

- 200 OK
- 400 Bad Request. Invalid request body or parameters.
- 401 Unauthorized. The current request does not contains any valid data to be used for authentication.
- 404 Not Found. The calendar id parameter is not a collaboration id.
- 500 Internal server error.

**Request:**

    POST /api/calendars/:calendarId/:calendarUri.json
    Accept: application/json
    Host: localhost:8080
    {
        "share": {
            "set": [
                {
                    "dav:href":"\url{mailto:user1@open-paas.org}",
                    "dav:read":true
                }
            ],
            "remove": [
                {
                    "dav:href":"\url{mailto:user2@open-paas.org}"
                }
            ]
        }
    }

**Response:**

    HTTP/1.1 200 OK

Annex C : Rights permissions proposal

### Rights in RSE
Roles can be describe with the following rights in OpenPaaS:

 * Access Invitees availability (Free/busy)
 * See event on a calendar
 * See event detail on a calendar
 * Write event on a calendar (create/modify event)
 * Modify properties on a calendar (name/color)
 * Share a calendar
