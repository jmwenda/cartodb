
  function PolygonCreator(map) {
    this.map = map;
    this.pen = new Pen(this.map,this);
    this.polygons = new Array();
    
    var thisOjb = this;
    this.event = google.maps.event.addListener(thisOjb.map,'click',function(event) {
      thisOjb.pen.draw(event.latLng);
    });
    
    this.showData=function() {
      return this.pen.getData();
    }
    
    this.showGeoJSON = function() {
      var str = '{"type":"MultiPolygon","coordinates":[';
      _.each(this.polygons,function(pol,i){
        var points = pol.getPath().getArray();
        str += '[[';
        _.each(points,function(point,i){
          str += '['+point.lng()+','+point.lat()+'],'
        });
        if (points.length>0) {
          str = str.substr(0, str.length-1);
        }
        str += ']],';
      });
      str = str.substr(0, str.length-1);
      str += ']}';
      return str;
    }
    
    this.destroy=function() {
      this.pen.deleteMis();
      if (null!=this.pen.polygon) {
        this.pen.polygon.remove();
      }
      _.each(this.polygons,function(pol,i) {
        pol.stopEdit();
        pol.setMap(null);
      });
      this.polygons = new Array();
      google.maps.event.removeListener(this.event);
    }
  }
  
    
  function Pen(map,polygon_creator) {   
    this.map=map;
    this.listOfDots=new Array();
    this.polyline=null;
    this.polygon=null;
    this.currentDot=null;
    this.parent = polygon_creator;
    
    this.draw=function(latLng) {
      if(this.currentDot!=null&&this.listOfDots.length>1&&this.currentDot==this.listOfDots[0]) {
        this.drawPloygon(this.listOfDots);
        this.setPolygonsClickable(true);
        // TEST
        this.parent.showGeoJSON();
      } else {
        this.setPolygonsClickable(false);
        if(null!=this.polyline) {
          this.polyline.remove();
        }
        var dot=new Dot(latLng,this.map,this);
        this.listOfDots.push(dot);
        if(this.listOfDots.length>1) {
          this.polyline=new Line(this.listOfDots,this.map);
        }
      }
    }
    
    this.addPolygon = function(polygon) {
      this.parent.polygons.push(polygon);
    }
    
    this.setPolygonsClickable = function(bool) {
      _.each(this.parent.polygons,function(pol,i) {
        pol.setOptions({clickable:bool});
        if (!bool) {
          pol.stopEdit();
        }
      });
    }
    
    
    this.drawPloygon=function(listOfDots,color,des,id) {
      this.polygon=new Polygon(listOfDots,this.map,this,color,des,id);
      this.deleteMis();
    }
    
    this.deleteMis=function() {
      $.each(this.listOfDots,function(index,value) {
        value.remove();
      });
      this.listOfDots.length=0;
      if(null!=this.polyline) {
        this.polyline.remove();
        this.polyline=null;
      }
    }
    
    this.cancel=function() {
      if(null!=this.polygon) {
        (this.polygon.remove());
      }
      this.polygon=null;
      this.deleteMis();
    }
    
    this.setCurrentDot=function(dot) {
      this.currentDot=dot;
    }
    
    this.getListOfDots=function() {
      return this.listOfDots;
    }
    
    this.getData=function() {
      if (this.polygon!=null) {
        var data="";
        var paths=this.polygon.getPlots();
        paths.getAt(0).forEach(function(value,index) {
          data+=(value.toString());
        });
        return data;
      } else {
        return null;
      }
    }
    
    
    this.getColor=function() {
      if(this.polygon!=null) {
        var color=this.polygon.getColor();
        return color;
      } else {
        return null;
      }
    }
  }
  
  
  function Dot(latLng,map,pen) {
    this.latLng=latLng;
    this.parent=pen;
    
    var image = new google.maps.MarkerImage('/images/admin/map/vertex.png',new google.maps.Size(11, 11),new google.maps.Point(0,0),new google.maps.Point(5, 5));
    
    this.markerObj=new google.maps.Marker({position:this.latLng,map:map,icon:image});
    this.addListener=function() {
      var parent=this.parent;
      var thisMarker=this.markerObj;
      var thisDot=this;
      google.maps.event.addListener(thisMarker,'click',function() {
        parent.setCurrentDot(thisDot);
        parent.draw(thisMarker.getPosition());
      });
    }
    
    this.addListener();
    this.getLatLng=function() {
      return this.latLng;
    }
    
    this.getMarkerObj=function() {
      return this.markerObj;
    }
    
    this.remove=function() {
      this.markerObj.setMap(null);
    }
  }
  
  
  function Line(listOfDots,map) {
    this.listOfDots=listOfDots;
    this.map=map;
    this.coords=new Array();
    this.polylineObj=null;
    if (this.listOfDots.length>1) {
      var thisObj=this;
      $.each(this.listOfDots,function(index,value) {
        thisObj.coords.push(value.getLatLng());
      });
      this.polylineObj=new google.maps.Polyline({path:this.coords,strokeColor:"#FF6600",strokeOpacity:1.0,strokeWeight:2,map:this.map});
    }

    this.remove=function() {
      this.polylineObj.setMap(null);
    }
  }
  
  
  function Polygon(listOfDots,map,pen,color) {
    this.listOfDots=listOfDots;
    this.map=map;
    this.coords=new Array();
    this.parent=pen;
    var thisObj=this;
    $.each(this.listOfDots,function(index,value) {
      thisObj.coords.push(value.getLatLng());
    });
    
    this.polygonObj=new google.maps.Polygon({paths:this.coords,strokeColor:"#FFFFFF",strokeOpacity:1,strokeWeight:2,fillColor:"#FF6600",fillOpacity:0.5,map:this.map,clickable:true});

    // Now the polygons are clickable
    this.parent.setPolygonsClickable(true);
    
    // Lets add this polygon to the array
    this.parent.addPolygon(this.polygonObj);
    
    
    google.maps.event.addListener(this.polygonObj,'click',function(ev){
      if (this.clickable) {
        this.runEdit();
      }
    });
    
    this.remove=function(){
      this.polygonObj.setMap(null);
    }
    
    this.getContent=function(){
      return this.des;
    }
    
    this.getPolygonObj=function(){
      return this.polygonObj;
    }
    
    this.getListOfDots=function(){
      return this.listOfDots;
    }
    
    this.getPlots=function(){
      return this.polygonObj.getPaths();
    }
  }