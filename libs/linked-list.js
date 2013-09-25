function List() {
    this.length = 0;
    this.first = null;
    this.last = null;
}

List.prototype.append = function(obj) {
    if (this.first === null) {
        obj.prev = obj;
        obj.next = obj;
        this.first = obj;
        this.last = obj;
    } else {
        obj.prev = this.last;
        obj.next = this.first;
        this.first.prev = obj;
        this.last.next = obj;
        this.last = obj;
    }
    ++this.length;
    return this;
};

List.prototype.insertAfter = function(after, obj) {
    obj.prev = after;
    obj.next = after.next;
    after.next.prev = obj;
    after.next = obj;
    if (obj.prev == this.last) { 
        this.last = obj; 
    }
    ++this.length;
    return this;
};

List.prototype.remove = function (obj) {
    if (this.length > 1) {
        obj.prev.next = obj.next;
        obj.next.prev = obj.prev;
        if (obj == this.first) { this.first = obj.next; }
        if (obj == this.last) { this.last = obj.prev; }
    } else {
        this.first = null;
        this.last = null;
    }
    obj.prev = null;
    obj.next = null;
    --this.length;
    return this;
};

List.prototype.at = function (index) {
    if (index >= this.length) {
        return false;
    }
    var obj = this.first;
    if (index===0) {
        return obj;
    }  
    for (var i=0; i<index;++i) {
        obj = obj.next;
    }
    return obj;
};

List.prototype.each = function (fn, context) {
    var bound = (context) ? W.bind(fn, context) : fn;
    var next = this.first;
    for (var i=0;i<this.length;++i) {
        bound(next, i);
        next = next.next;
    }
    return this;
};

List.prototype.sendToBack = function (obj) {
    this.remove(obj);
    this.append(obj);
};

module.exports = List;